import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/components/sidebar";
import { DashboardHeader } from "@/app/components/dashboard/dashboard-header";
import { AppToaster } from "@/app/components/theme/app-toaster";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/app/lib/supabaseServer";
import {
  getMembershipTeam,
  getTeamMemberships,
} from "@/app/lib/team-context";
import type { LayoutProps } from "@/app/types/common";

export default async function DashboardLayout({
  children,
}: LayoutProps) {
  const { user, error } = await getCurrentIdentity();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { memberships, error: teamError } = await getTeamMemberships(user.id);
  const hasTeam = !teamError && memberships.length > 0;
  const firstMembership = memberships[0];
  const metadata = user.user_metadata ?? {};
  const metadataName =
    typeof metadata.full_name === "string"
      ? metadata.full_name.trim()
      : typeof metadata.name === "string"
        ? metadata.name.trim()
        : "";
  const metadataAvatar =
    typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : typeof metadata.picture === "string"
        ? metadata.picture
        : "";
  const headerUser = {
    name:
      metadataName ||
      firstMembership?.name ||
      user.email?.split("@")[0] ||
      "User",
    avatarUrl: metadataAvatar || firstMembership?.avatar_url || null,
  };
  const headerTeams = Array.from(
    new Map(
      memberships.map((membership) => [
        membership.team_id,
        {
          id: membership.team_id,
          name: getMembershipTeam(membership)?.name ?? null,
        },
      ]),
    ).values(),
  );

  return (
    <SidebarProvider>
      <AppToaster />
      <div className="flex min-h-screen w-full">
        {hasTeam && <AppSidebar />}
        <main className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden bg-accent">
          {hasTeam ? (
            <DashboardHeader user={headerUser} teams={headerTeams} />
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
