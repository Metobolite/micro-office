import { ThemeToggle } from "@/app/components/theme";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabaseServer";
import LoginButton from "./LoginButton";

type LoginSearchParams = {
  next?: string | string[];
};

function getSafeNextPath(next?: string | string[]) {
  const nextPath = Array.isArray(next) ? next[0] : next;

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/teams";
  }

  return nextPath;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<LoginSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = getSafeNextPath(resolvedSearchParams?.next);
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <ThemeToggle className="absolute right-6 top-6" />
      <div className="rounded-xl border bg-card p-10 text-card-foreground shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold">Sign In</h1>
        <LoginButton redirectPath={nextPath} />
      </div>
    </div>
  );
}
