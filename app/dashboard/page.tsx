import { createClient } from "@/app/lib/supabaseServer";
import { DashboardHeader } from "@/app/components/dashboard/dashboard-header";
import { StatsCards } from "@/app/components/dashboard/stats-cards";
import { RecentTasks } from "@/app/components/dashboard/recent-tasks";
import { TeamMembers } from "@/app/components/dashboard/team-members";
import { RecentMessages } from "@/app/components/dashboard/recent-messages";
import { RecentFiles } from "@/app/components/dashboard/recent-files";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return <div className="text-center mt-10">Lütfen giriş yapın.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        userName={user.user_metadata?.full_name || user.email || "Kullanıcı"}
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <StatsCards />
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <RecentTasks />
          <TeamMembers />
          <RecentMessages />
        </div>
        <RecentFiles />
      </div>
    </div>
  );
}
