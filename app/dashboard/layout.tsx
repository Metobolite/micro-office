import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/components/sidebar";
import { AppToaster } from "@/app/components/theme/app-toaster";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/app/lib/supabaseServer";
import { getTeamMemberships } from "@/app/lib/team-context";
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

  return (
    <SidebarProvider>
      <AppToaster />
      <div className="flex min-h-screen w-full">
        {hasTeam && <AppSidebar />}
        <main className="flex-1 overflow-hidden bg-accent">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
