import { DashboardHeader } from "@/app/components/dashboard/dashboard-header";
import { RecentFiles } from "@/app/components/dashboard/recent-files";
import { RecentMessages } from "@/app/components/dashboard/recent-messages";
import { RecentTasks } from "@/app/components/dashboard/recent-tasks";
import StatsCards from "@/app/components/dashboard/stats-cards";
import { TeamMembers } from "@/app/components/dashboard/team-members";
import CreateTeamForm from "@/app/components/team/CreateTeamForm";
import { createClient } from "@/app/lib/supabaseServer";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
  type TeamSearchParams,
} from "../lib/team-context";
import { redirect } from "next/navigation";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<TeamSearchParams>;
}) {
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
    return <CreateTeamForm userId={user.id} />;
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        userName={user.user_metadata?.full_name || user.email || "User"}
        teamName={activeTeam?.name}
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <StatsCards teamId={activeTeamId} />
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <RecentTasks teamId={activeTeamId} />
          <TeamMembers teamId={activeTeamId} />
          <RecentMessages teamId={activeTeamId} />
        </div>
        <RecentFiles teamId={activeTeamId} />
      </div>
    </div>
  );
}
