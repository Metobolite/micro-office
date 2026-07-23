import { DashboardHeaderActions } from "@/app/components/dashboard/dashboard-header-actions";
import { AddTeamMemberForm } from "@/app/components/team/AddTeamMemberForm";
import { TeamPresenceProvider } from "@/app/components/presence/TeamPresenceProvider";
import { TeamPresenceView } from "@/app/components/team/TeamPresenceView";
import {
  createClient,
  getCurrentIdentity,
} from "@/app/lib/supabaseServer";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import type { TeamSearchPageProps } from "@/app/types/team";
import type { TeamMemberPresenceCard } from "@/app/types/presence";
import { redirect } from "next/navigation";

export default async function TeamPage({ searchParams }: TeamSearchPageProps) {
  const [{ user, error }, resolvedSearchParams] = await Promise.all([
    getCurrentIdentity(),
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
  const inviterRole =
    activeMembership?.role === "owner" || activeMembership?.role === "admin"
      ? activeMembership.role
      : null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select(
      "team_id, user_id, role, joined_at, name, email, phone, avatar_url",
    )
    .eq("team_id", activeTeamId)
    .order("joined_at", { ascending: false });

  const teamMembers: TeamMemberPresenceCard[] = (data || []).map((member) => ({
    teamId: member.team_id,
    userId: member.user_id,
    role: member.role,
    name: member.name || "Member",
    email: member.email || "test@example.com",
    phone: member.phone || "+90 555 000 0000",
    avatarUrl: member.avatar_url,
    joinedLabel: member.joined_at
      ? new Date(member.joined_at).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
        })
      : "Unknown",
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {inviterRole ? (
        <DashboardHeaderActions>
          <AddTeamMemberForm
            key={`${activeTeamId}:${inviterRole}`}
            teamId={activeTeamId}
            inviterRole={inviterRole}
          />
        </DashboardHeaderActions>
      ) : null}

      <TeamPresenceProvider
        userId={user.id}
        teamIds={[activeTeamId]}
        defaultTeamId={activeTeamId}
      >
        <TeamPresenceView members={teamMembers} teamId={activeTeamId} />
      </TeamPresenceProvider>
    </div>
  );
}
