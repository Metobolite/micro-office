import Link from "next/link";

import { ThemeToggle } from "./components/theme/theme-toggle";
import { getCurrentClaims } from "./lib/supabaseServer";

export default async function Home() {
  const { data } = await getCurrentClaims();
  const loggedIn = Boolean(data?.claims);
  const destination = loggedIn ? "/teams" : "/auth/login";

  return (
    <main>
      <div className="relative flex min-h-screen min-w-full flex-col items-center justify-center bg-background px-6 text-foreground">
        <ThemeToggle className="absolute right-6 top-6" />
        <h1 className="mb-6 text-center text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Welcome to Micro Office
        </h1>
        <div className="flex max-w-md flex-col gap-4 text-center text-muted-foreground">
          <p>Micro Office is a simple task management app.</p>
          <h2>Please sign in to continue.</h2>
          <Link
            href={destination}
            className="rounded-lg bg-primary px-6 py-2 text-2xl text-primary-foreground! shadow-sm transition duration-300 hover:-translate-y-1 hover:bg-primary/90 hover:shadow-md"
          >
            {loggedIn ? "Go to Teams" : "Sign in"}
          </Link>
        </div>
      </div>
    </main>
  );
}
