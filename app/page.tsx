import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Files,
  ListChecks,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/app/components/page-shell";

import { ThemeToggle } from "./components/theme/theme-toggle";
import { getCurrentClaims } from "./lib/supabaseServer";

const workspaceFeatures = [
  {
    icon: ListChecks,
    title: "Plan the work",
    description: "Keep priorities and progress visible.",
  },
  {
    icon: MessagesSquare,
    title: "Stay in sync",
    description: "Bring team conversations together.",
  },
  {
    icon: Files,
    title: "Share the context",
    description: "Keep important files close to the work.",
  },
];

export default async function Home() {
  const { data } = await getCurrentClaims();
  const loggedIn = Boolean(data?.claims);
  const destination = loggedIn ? "/teams" : "/auth/login";

  return (
    <PageShell>
      <main className="relative flex flex-1 flex-col overflow-hidden bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_45%)]"
          aria-hidden="true"
        />
        <ThemeToggle className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6" />

        <div className="relative mx-auto flex w-full max-w-5xl flex-1 items-center justify-center">
          <div className="grid w-full overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/95 shadow-xl shadow-black/5 backdrop-blur-xl lg:grid-cols-[0.8fr_1.2fr]">
            <section className="flex flex-col justify-between border-b border-border/70 bg-background/70 p-8 sm:p-10 lg:border-b-0 lg:border-r lg:p-10">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
                  Micro Office
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  All your teamwork, in one calm place.
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                  Plan projects, share updates, and keep your team moving without
                  losing focus.
                </p>
              </div>

              <Button
                asChild
                size="lg"
                className="h-12 w-full justify-between rounded-xl px-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link href={destination}>
                  <span>{loggedIn ? "Go to Teams" : "Sign in to continue"}</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>

                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                    {loggedIn ? "Welcome back" : "Get started"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {loggedIn
                      ? "Your workspace is ready."
                      : "Bring your team’s work into focus."}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {loggedIn
                      ? "You’re already signed in. Continue directly to your teams and pick up where you left off."
                      : "Sign in securely to manage tasks, conversations, files, and your team’s daily flow."}
                  </p>
                </div>

                <Button
                  asChild
                  size="lg"
                  className="h-12 w-full justify-between rounded-xl px-5 text-primary-foreground! shadow-sm transition-all hover:-translate-y-0.5 hover:text-primary-foreground! hover:shadow-md"
                >
                  <Link href={destination}>
                    <span>{loggedIn ? "Go to Teams" : "Sign in to continue"}</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>

                <div className="mt-4 flex items-start gap-3 rounded-xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
                  <ShieldCheck
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-semibold">
                      {loggedIn ? "No sign-in required" : "Fast and secure access"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {loggedIn
                        ? "Your existing session will take you straight to your teams."
                        : "Use your Google or GitHub account on the next screen."}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
