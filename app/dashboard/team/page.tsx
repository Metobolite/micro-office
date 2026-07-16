import { AddTeamMemberForm } from "@/app/components/team/AddTeamMemberForm";
import { TeamPresenceView } from "@/app/components/team/TeamPresenceView";
import { createClient } from "@/app/lib/supabaseServer";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import type { TeamSearchPageProps } from "@/app/types/team";
import type { TeamMemberPresenceCard } from "@/app/types/presence";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";

export default async function TeamPage({ searchParams }: TeamSearchPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedTeamId = getTeamIdFromSearchParams(resolvedSearchParams);

  const { activeTeamId, isRequestedTeamIdValid, memberships } =
    await getTeamContext(supabase, user.id, requestedTeamId);

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
    <div className="flex flex-col h-full">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">Team</h1>
          {inviterRole ? (
            <AddTeamMemberForm
              key={`${activeTeamId}:${inviterRole}`}
              teamId={activeTeamId}
              inviterRole={inviterRole}
            />
          ) : null}
        </div>
      </header>

      <TeamPresenceView members={teamMembers} teamId={activeTeamId} />
    </div>
  );
}
