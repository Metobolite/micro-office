import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/components/sidebar";
import { TeamPresenceProvider } from "@/app/components/presence/TeamPresenceProvider";
import { AppToaster } from "@/app/components/theme";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabaseServer";
import type { LayoutProps } from "@/app/types/common";

export default async function DashboardLayout({
  children,
}: LayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { data: teamMemberships, error: teamError } = await supabase
    .from("team_members")
    .select("team_id, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .order("team_id", { ascending: true });

  const teamIds = Array.from(
    new Set((teamMemberships ?? []).map((membership) => membership.team_id)),
  );
  const defaultTeamId = teamIds[0] ?? null;
  const hasTeam = teamIds.length > 0 && !teamError;

  return (
    <SidebarProvider>
      <AppToaster />
      <div className="flex min-h-screen w-full">
        {hasTeam && <AppSidebar />}
        <main className="flex-1 overflow-hidden bg-accent">
          <TeamPresenceProvider
            userId={user.id}
            teamIds={teamIds}
            defaultTeamId={defaultTeamId}
          >
            {children}
          </TeamPresenceProvider>
        </main>
      </div>
    </SidebarProvider>
  );
}
