import { SettingsClient } from "@/app/components/settings/SettingsClient";
import { getCurrentUser } from "@/app/lib/supabaseServer";
import {
  getTeam,
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import type { TeamSearchPageProps } from "@/app/types/team";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";

function formatAccountDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function SettingsPage({
  searchParams,
}: TeamSearchPageProps) {
  const [{ user, error }, resolvedSearchParams] = await Promise.all([
    getCurrentUser(),
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
    redirect("/teams");
  }

  const activeTeam = await getTeam(activeTeamId);

  if (!activeTeam) {
    redirect("/teams");
  }

  const activeMembership = memberships.find(
    (membership) => membership.team_id === activeTeamId,
  );
  const metadata = user.user_metadata || {};
  const fullName =
    metadata.full_name ||
    metadata.name ||
    activeMembership?.name ||
    user.email?.split("@")[0] ||
    "User";
  const role = activeMembership?.role || "member";

  return (
    <div className="flex h-screen min-h-0 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Manage your profile, workspace and appearance.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <SettingsClient
          key={activeTeamId}
          profile={{
            fullName,
            email: user.email || activeMembership?.email || "",
            phone: metadata.phone || activeMembership?.phone || "",
            avatarUrl:
              metadata.avatar_url ||
              activeMembership?.avatar_url ||
              metadata.picture ||
              "",
            createdAt: formatAccountDate(user.created_at),
          }}
          workspace={{
            id: activeTeamId,
            name: activeTeam.name || "Untitled workspace",
            role,
            canManage: role === "owner" || role === "admin",
          }}
        />
      </div>
    </div>
  );
}
