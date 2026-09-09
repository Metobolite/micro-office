"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Page could not be loaded:", error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-16 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We could not load this page. Please try again in a moment.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={retry}>Try again</Button>
          <Button asChild variant="ghost"><Link href="/">Back to home</Link></Button>
        </div>
        {error.digest ? (
          <p className="mt-6 text-xs text-muted-foreground">Error reference: {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
