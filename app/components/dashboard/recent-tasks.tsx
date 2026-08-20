import { createClient } from "@/app/lib/supabaseServer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamScopedProps } from "@/app/types/team";

const statusClassNames: Record<string, string> = {
  todo: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  in_progress:
    "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  done: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const priorityClassNames: Record<string, string> = {
  high: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  medium:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export async function RecentTasks({ teamId }: TeamScopedProps) {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, status, priority, due_date")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(4);

  if (error || !tasks) {
    return (
      <Card className="h-full gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-base">Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Tasks could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-base">Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {tasks.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            No recent tasks.
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.due_date ? (
                    <time dateTime={task.due_date}>
                      {formatDate(task.due_date)}
                    </time>
                  ) : (
                    "No due date"
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <Badge
                  variant="outline"
                  className={
                    statusClassNames[task.status] ??
                    "border-border bg-muted text-muted-foreground"
                  }
                >
                  {formatLabel(task.status)}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    priorityClassNames[task.priority] ??
                    "border-border bg-muted text-muted-foreground"
                  }
                >
                  {formatLabel(task.priority)}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
