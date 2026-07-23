import { RecentFiles } from "@/app/components/dashboard/recent-files";
import { RecentMessages } from "@/app/components/dashboard/recent-messages";
import { RecentTasks } from "@/app/components/dashboard/recent-tasks";
import StatsCards from "@/app/components/dashboard/stats-cards";
import { TeamMembers } from "@/app/components/dashboard/team-members";
import CreateTeamForm from "@/app/components/team/CreateTeamForm";
import { getCurrentIdentity } from "@/app/lib/supabaseServer";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "../lib/team-context";
import type { TeamSearchPageProps } from "@/app/types/team";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";
import { Suspense } from "react";

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
  const { activeTeamId, isRequestedTeamIdValid } = await getTeamContext(
    user.id,
    requestedTeamId,
  );

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

  return (
    <div className="h-full space-y-6 overflow-auto p-6">
      <Suspense fallback={<StatsCardsFallback />}>
        <StatsCards teamId={activeTeamId} />
      </Suspense>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
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
  );
}
