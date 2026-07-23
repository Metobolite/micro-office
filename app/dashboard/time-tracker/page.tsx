import TeamTimeTracker from "@/app/components/time-tracker/TeamTimeTracker";
import {
  getMembershipTeam,
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import {
  createClient,
  getCurrentIdentity,
} from "@/app/lib/supabaseServer";
import type { TeamSearchPageProps } from "@/app/types/team";
import type { TimeTrackerTask } from "@/app/types/time-tracker";
import { redirect } from "next/navigation";

export default async function TimeTrackerPage({
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
  const { activeTeamId, isRequestedTeamIdValid, memberships } =
    await getTeamContext(user.id, requestedTeamId);

  if (requestedTeamId && !isRequestedTeamIdValid) {
    redirect("/teams");
  }

  if (!activeTeamId) {
    redirect("/teams");
  }

  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, priority")
    .eq("user_id", user.id)
    .eq("team_id", activeTeamId)
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true });
  const activeMembership = memberships.find(
    (membership) => membership.team_id === activeTeamId,
  );

  return (
    <TeamTimeTracker
      key={activeTeamId}
      userId={user.id}
      teamId={activeTeamId}
      teamName={getMembershipTeam(activeMembership)?.name ?? undefined}
      initialTasks={(tasks as TimeTrackerTask[]) ?? []}
    />
  );
}
