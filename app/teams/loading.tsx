import { Skeleton } from "@/components/ui/skeleton";

export default function TeamsLoading() {
  return (
    <div
      className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8"
      aria-label="Loading teams"
      aria-busy="true"
    >
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="space-y-4 rounded-3xl border bg-card p-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-px w-full" />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
