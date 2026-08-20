import { RecentFiles } from "@/app/components/dashboard/recent-files";
import { RecentMessages } from "@/app/components/dashboard/recent-messages";
import { RecentTasks } from "@/app/components/dashboard/recent-tasks";
import StatsCards from "@/app/components/dashboard/stats-cards";
import { TeamMembers } from "@/app/components/dashboard/team-members";
import CreateTeamForm from "@/app/components/team/CreateTeamForm";
import { getResolvedProfileAvatarUrl } from "@/app/lib/profile-avatar";
import { getCurrentUser } from "@/app/lib/supabaseServer";
import { getTeamContext } from "../lib/team-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function StatsCardsFallback() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="gap-0 py-0 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DashboardCardFallback() {
  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-5 py-4">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="divide-y p-0">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="px-5 py-3">
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { user, error } = await getCurrentUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { activeTeamId } = await getTeamContext(user.id);

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
        userAvatarUrl={getResolvedProfileAvatarUrl(
          user.user_metadata,
          user.id,
        )}
      />
    );
  }

  return (
    <div className="mx-auto h-full w-full max-w-[1440px] space-y-5 overflow-auto p-4 sm:p-6 lg:p-8">
      <Suspense fallback={<StatsCardsFallback />}>
        <StatsCards teamId={activeTeamId} />
      </Suspense>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Suspense fallback={<DashboardCardFallback />}>
          <RecentTasks teamId={activeTeamId} />
        </Suspense>
        <Suspense fallback={<DashboardCardFallback />}>
          <TeamMembers teamId={activeTeamId} />
        </Suspense>
        <div className="lg:col-span-2 xl:col-span-1">
          <Suspense fallback={<DashboardCardFallback />}>
            <RecentMessages teamId={activeTeamId} />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={<DashboardCardFallback />}>
        <RecentFiles teamId={activeTeamId} />
      </Suspense>
    </div>
  );
}
