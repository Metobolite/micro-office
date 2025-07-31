import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/app/lib/supabaseServer";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function RecentTasks() {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(4);

  if (error || !tasks) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Son Görevler</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Görevler yüklenemedi.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Son Görevler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={task.avatar || "/placeholder.svg"} />
                <AvatarFallback>
                  {task.assignee_name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("") || "NA"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(task.due_date)}
                </p>
              </div>
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
                    : "bg-gray-400 text-white"
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
