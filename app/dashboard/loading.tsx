import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div
      className="flex h-full min-h-screen flex-col"
      aria-label="Loading page"
      aria-busy="true"
    >
      <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
        <Skeleton className="size-8" />
        <Skeleton className="h-5 w-32" />
      </header>
      <div className="grid flex-1 gap-4 overflow-hidden p-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className="h-32 w-full sm:h-40 xl:h-48"
          />
        ))}
        <Skeleton className="h-72 w-full sm:col-span-2 xl:col-span-4" />
      </div>
    </div>
  );
}
