import { createClient } from "@/app/lib/supabaseServer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamScopedProps } from "@/app/types/team";

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
      <Card>
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tasks could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {task.due_date ? formatDate(task.due_date) : "No due date"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  task.status === "done"
                    ? "default"
                    : task.status === "in_progress"
                      ? "third"
                      : "secondary"
                }
              >
                {task.status.replace("_", " ")}{" "}
              </Badge>
              <Badge
                className={
                  task.priority === "high"
                    ? "bg-red-500 text-white"
                    : task.priority === "medium"
                      ? "bg-yellow-300 text-black"
                      : task.priority === "low"
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                }
              >
                {task.priority}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
