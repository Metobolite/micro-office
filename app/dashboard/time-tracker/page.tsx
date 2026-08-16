import TeamTimeTracker from "@/app/components/time-tracker/TeamTimeTracker";
import {
  getMembershipTeam,
  getTeamContext,
} from "@/app/lib/team-context";
import {
  createClient,
  getCurrentIdentity,
} from "@/app/lib/supabaseServer";
import type { TimeTrackerTask } from "@/app/types/time-tracker";
import { redirect } from "next/navigation";

export default async function TimeTrackerPage() {
  const { user, error } = await getCurrentIdentity();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { activeTeamId, memberships } = await getTeamContext(user.id);

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
