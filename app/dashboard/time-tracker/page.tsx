import TeamTimeTracker from "@/app/components/time-tracker/TeamTimeTracker";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import { createClient } from "@/app/lib/supabaseServer";
import type { TeamSearchPageProps } from "@/app/types/team";
import type { TimeTrackerTask } from "@/app/types/time-tracker";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";

export default async function TimeTrackerPage({
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
  const { activeTeamId, activeTeam, isRequestedTeamIdValid } =
    await getTeamContext(supabase, user.id, requestedTeamId);

  if (requestedTeamId && !isRequestedTeamIdValid) {
    redirect("/teams");
  }

  if (!activeTeamId) {
    redirect("/teams");
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, priority")
    .eq("user_id", user.id)
    .eq("team_id", activeTeamId)
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true });

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div>
          <h1 className="text-xl font-semibold">Time Tracking</h1>
          {activeTeam?.name ? (
            <p className="text-xs text-muted-foreground">
              {activeTeam.name}
            </p>
          ) : null}
        </div>
      </header>

      <TeamTimeTracker
        key={activeTeamId}
        userId={user.id}
        teamId={activeTeamId}
        teamName={activeTeam?.name}
        initialTasks={(tasks as TimeTrackerTask[]) ?? []}
      />
    </div>
  );
}
