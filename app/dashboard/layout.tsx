import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/components/sidebar";
import { AppToaster } from "@/app/components/theme";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabaseServer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { data: teamMembership, error: teamError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const hasTeam = !!teamMembership && !teamError;

  return (
    <SidebarProvider>
      <AppToaster />
      <div className="flex min-h-screen w-full">
        {hasTeam && <AppSidebar />}
        <main className="flex-1 overflow-hidden bg-accent">{children}</main>
      </div>
    </SidebarProvider>
  );
}
