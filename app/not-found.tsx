import Link from "next/link";
import { PageShell } from "@/app/components/page-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageShell>
      <main className="flex flex-1 items-center justify-center px-6 py-16 text-center">
        <div className="max-w-md">
          <p className="text-sm font-medium text-muted-foreground">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Page not found</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This page may have moved, or the link may be incomplete.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </main>
    </PageShell>
  );
}
