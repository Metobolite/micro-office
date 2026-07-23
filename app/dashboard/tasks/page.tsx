import {
  getTeam,
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import { Task } from "@/app/types/task";
import type { TeamSearchPageProps } from "@/app/types/team";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";
import TasksPageClient from "../../components/tasks/TasksPageClient";
import {
  createClient,
  getCurrentIdentity,
} from "../../lib/supabaseServer";

export default async function TasksPage({
  searchParams,
}: TeamSearchPageProps) {
  const [{ user, error }, resolvedSearchParams] = await Promise.all([
    getCurrentIdentity(),
    searchParams,
  ]);

  if (!user || error) {
    redirect("/auth/login");
  }

  const requestedTeamId = getTeamIdFromSearchParams(resolvedSearchParams);

  const { activeTeamId, isRequestedTeamIdValid } = await getTeamContext(
    user.id,
    requestedTeamId,
  );

  if (requestedTeamId && !isRequestedTeamIdValid) {
    redirect("/teams");
  }

  if (!activeTeamId) {
    redirect("/teams");
  }

  const supabase = await createClient();
  const [activeTeam, { data: tasks, error: tasksError }] = await Promise.all([
    getTeam(activeTeamId),
    supabase
      .from("tasks")
      .select("id, title, description, status, priority, sort_order, due_date")
      .eq("user_id", user.id)
      .eq("team_id", activeTeamId)
      .order("status", { ascending: true })
      .order("sort_order", { ascending: true }),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div>
          <h1 className="text-xl font-semibold">Tasks</h1>
          {activeTeam?.name ? (
            <p className="text-xs text-muted-foreground">{activeTeam.name}</p>
          ) : null}
        </div>
      </header>
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
