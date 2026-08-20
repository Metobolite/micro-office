import { SettingsClient } from "@/app/components/settings/SettingsClient";
import { getProfileAvatarSources } from "@/app/lib/profile-avatar";
import { getCurrentUser } from "@/app/lib/supabaseServer";
import {
  getMembershipTeam,
  getTeamContext,
} from "@/app/lib/team-context";
import { redirect } from "next/navigation";

function formatAccountDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function SettingsPage() {
  const { user, error } = await getCurrentUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { activeTeamId, memberships } = await getTeamContext(user.id);

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
  const avatarSources = getProfileAvatarSources(metadata, user.id);

  return (
    <div className="h-full overflow-y-auto">
      <SettingsClient
        key={[
          activeTeamId,
          fullName,
          metadata.phone || "",
          avatarSources.customAvatarUrl || "",
          avatarSources.providerAvatarUrl || "",
        ].join(":")}
        profile={{
          fullName,
          email: user.email || activeMembership.email || "",
          phone: metadata.phone || activeMembership.phone || "",
          customAvatarUrl: avatarSources.customAvatarUrl || "",
          providerAvatarUrl: avatarSources.providerAvatarUrl || "",
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
