import { getTeamContext } from "@/app/lib/team-context";
import { Task } from "@/app/types/task";
import { redirect } from "next/navigation";
import TasksPageClient from "../../components/tasks/TasksPageClient";
import {
  createClient,
  getCurrentIdentity,
} from "../../lib/supabaseServer";

export default async function TasksPage() {
  const { user, error } = await getCurrentIdentity();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { activeTeamId } = await getTeamContext(user.id);

  if (!activeTeamId) {
    redirect("/teams");
  }

  const supabase = await createClient();
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, sort_order, due_date")
    .eq("user_id", user.id)
    .eq("team_id", activeTeamId)
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TasksPageClient
        key={activeTeamId}
        userId={user.id}
        teamId={activeTeamId}
        initialTasks={(tasks as Task[]) ?? []}
        initialLoadFailed={Boolean(tasksError)}
      />
    </div>
  );
}
