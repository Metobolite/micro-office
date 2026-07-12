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
} from "../lib/team-context";
import type { TeamSearchPageProps } from "@/app/types/team";
import { redirect } from "next/navigation";

export default async function DashboardPage({
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
  const { activeTeamId, activeTeam, isRequestedTeamIdValid, memberships } =
    await getTeamContext(supabase, user.id, requestedTeamId);

  if (requestedTeamId && !isRequestedTeamIdValid) {
    redirect("/teams");
  }

  if (!activeTeamId) {
    return <CreateTeamForm userId={user.id} />;
  }

  const activeMembership = memberships.find(
    (membership) => membership.team_id === activeTeamId,
  );
  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "";
  const metadataAvatar =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : "";
  const providerAvatar =
    typeof user.user_metadata?.picture === "string"
      ? user.user_metadata.picture
      : "";
  const dashboardUser = {
    name:
      metadataFullName ||
      metadataName ||
      activeMembership?.name ||
      user.email?.split("@")[0] ||
      "User",
    avatarUrl:
      metadataAvatar || activeMembership?.avatar_url || providerAvatar || null,
  };

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        user={dashboardUser}
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
