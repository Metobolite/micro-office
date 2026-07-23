import { SettingsClient } from "@/app/components/settings/SettingsClient";
import { getCurrentUser } from "@/app/lib/supabaseServer";
import {
  getMembershipTeam,
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import type { TeamSearchPageProps } from "@/app/types/team";
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

  const activeMembership = memberships.find(
    (membership) => membership.team_id === activeTeamId,
  );

  if (!activeMembership) {
    redirect("/teams");
  }
  const metadata = user.user_metadata || {};
  const fullName =
    metadata.full_name ||
    metadata.name ||
    activeMembership?.name ||
    user.email?.split("@")[0] ||
    "User";
  const role = activeMembership?.role || "member";
  const activeTeam = getMembershipTeam(activeMembership);

  return (
    <div className="h-full overflow-y-auto">
      <SettingsClient
        key={activeTeamId}
        profile={{
          fullName,
          email: user.email || activeMembership.email || "",
          phone: metadata.phone || activeMembership.phone || "",
          avatarUrl:
            metadata.avatar_url ||
            activeMembership.avatar_url ||
            metadata.picture ||
            "",
          createdAt: formatAccountDate(user.created_at),
        }}
        workspace={{
          id: activeTeamId,
          name: activeTeam?.name || "Untitled workspace",
          role,
          canManage: role === "owner" || role === "admin",
        }}
      />
    </div>
  );
}
