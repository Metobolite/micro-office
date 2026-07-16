import { createClient } from "../../lib/supabaseServer";
import TeamChat from "../../components/chat/TeamChat";
import { redirect } from "next/navigation";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import type { TeamSearchPageProps } from "@/app/types/team";
import type { TeamPresenceProfile } from "@/app/types/presence";

export default async function DashboardPage({
  searchParams,
}: TeamSearchPageProps) {
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

  const { activeTeamId, isRequestedTeamIdValid } = await getTeamContext(
    supabase,
    user.id,
    requestedTeamId,
  );

  if (requestedTeamId && !isRequestedTeamIdValid) {
    redirect("/teams");
  }

  if (!activeTeamId) {
    redirect("/teams");
  }

  const { data: memberRows, error: memberRowsError } = await supabase
    .from("team_members")
    .select("user_id, name, email, avatar_url")
    .eq("team_id", activeTeamId)
    .order("joined_at", { ascending: true });

  const members: TeamPresenceProfile[] = (memberRows ?? []).flatMap(
    (member) => {
      if (!member.user_id) return [];

      return [
        {
          userId: member.user_id,
          name:
            member.name || member.email?.split("@")[0] || "Team member",
          avatarUrl: member.avatar_url,
        },
      ];
    },
  );

  return (
    <TeamChat
      key={activeTeamId}
      userId={user.id}
      userName={user.user_metadata?.full_name || user.email || "User"}
      teamId={activeTeamId}
      members={members}
      membersLoaded={!memberRowsError}
    />
  );
}
