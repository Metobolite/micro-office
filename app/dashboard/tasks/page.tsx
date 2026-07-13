import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import { Task } from "@/app/types/task";
import type { TeamSearchPageProps } from "@/app/types/team";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";
import TasksPageClient from "../../components/tasks/TasksPageClient";
import { createClient } from "../../lib/supabaseServer";

export default async function TasksPage({
  searchParams,
}: TeamSearchPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedTeamId = getTeamIdFromSearchParams(resolvedSearchParams);

  const { activeTeamId, isRequestedTeamIdValid } = await getTeamContext(
    supabase,
    user.id,
    requestedTeamId,
  );

  if (requestedTeamId && !isRequestedTeamIdValid) {
    redirect("/teams");
  }

  if (!activeTeamId) {
    redirect("/teams");
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("team_id", activeTeamId)
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true });

  return (
    <div>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">Tasks</h1>
        </div>
      </header>
      <TasksPageClient
        userId={user.id}
        teamId={activeTeamId}
        initialTasks={(tasks as Task[]) ?? []}
      />
    </div>
  );
}
