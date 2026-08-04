import { ThemeToggle } from "@/app/components/theme/theme-toggle";
import { redirect } from "next/navigation";
import { getCurrentClaims } from "../../lib/supabaseServer";
import LoginButton from "./LoginButton";
import type { LoginPageProps } from "@/app/types/auth";

function getSafeNextPath(next?: string | string[]) {
  const nextPath = Array.isArray(next) ? next[0] : next;

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/teams";
  }

  return nextPath;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const [resolvedSearchParams, { data }] = await Promise.all([
    searchParams,
    getCurrentClaims(),
  ]);
  const nextPath = getSafeNextPath(resolvedSearchParams?.next);

  if (data?.claims) {
    redirect(nextPath);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_45%)]" />
      <ThemeToggle className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/95 shadow-xl shadow-black/5 backdrop-blur-xl lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col justify-center border-b border-border/70 bg-background/70 p-8 sm:p-10 lg:border-b-0 lg:border-r lg:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Micro Office
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Return to your workflow.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Review tasks, coordinate with your team, and continue your work in one place.
            </p>
          </div>

          <div className="flex items-center justify-center p-8 sm:p-10 lg:p-12">
            <div className="w-full max-w-md">
              <div className="mb-6 text-center lg:text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  Welcome back
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Sign in to your account</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Choose one of the options below to continue.
                </p>
              </div>

              <LoginButton redirectPath={nextPath} />

              <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">
                By signing in, you agree to our terms of use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
