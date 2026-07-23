import { DashboardHeader } from "@/app/components/dashboard/dashboard-header";
import { RecentFiles } from "@/app/components/dashboard/recent-files";
import { RecentMessages } from "@/app/components/dashboard/recent-messages";
import { RecentTasks } from "@/app/components/dashboard/recent-tasks";
import StatsCards from "@/app/components/dashboard/stats-cards";
import { TeamMembers } from "@/app/components/dashboard/team-members";
import CreateTeamForm from "@/app/components/team/CreateTeamForm";
import { getCurrentIdentity } from "@/app/lib/supabaseServer";
import {
  getTeam,
  getTeamContext,
  getTeamIdFromSearchParams,
} from "../lib/team-context";
import type { DashboardUser } from "@/app/types/dashboard";
import type { TeamSearchPageProps } from "@/app/types/team";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function DashboardHeaderData({
  activeTeamId,
  user,
}: {
  activeTeamId: string;
  user: DashboardUser;
}) {
  const activeTeam = await getTeam(activeTeamId);
  return <DashboardHeader user={user} teamName={activeTeam?.name} />;
}

function StatsCardsFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-14" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DashboardCardFallback() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage({
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
    return (
      <CreateTeamForm
        userId={user.id}
        userName={
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          ""
        }
        userEmail={user.email || ""}
      />
    );
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
      <Suspense
        fallback={<DashboardHeader user={dashboardUser} teamName={null} />}
      >
        <DashboardHeaderData
          activeTeamId={activeTeamId}
          user={dashboardUser}
        />
      </Suspense>
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <Suspense fallback={<StatsCardsFallback />}>
          <StatsCards teamId={activeTeamId} />
        </Suspense>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <Suspense fallback={<DashboardCardFallback />}>
            <RecentTasks teamId={activeTeamId} />
          </Suspense>
          <Suspense fallback={<DashboardCardFallback />}>
            <TeamMembers teamId={activeTeamId} />
          </Suspense>
          <Suspense fallback={<DashboardCardFallback />}>
            <RecentMessages teamId={activeTeamId} />
          </Suspense>
        </div>
        <Suspense fallback={<DashboardCardFallback />}>
          <RecentFiles teamId={activeTeamId} />
        </Suspense>
      </div>
    </div>
  );
}
