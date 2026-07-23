import {
  createClient,
  getCurrentIdentity,
} from "../../lib/supabaseServer";
import TeamChat from "../../components/chat/TeamChat";
import { redirect } from "next/navigation";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import type { TeamSearchPageProps } from "@/app/types/team";
import type { TeamPresenceProfile } from "@/app/types/presence";
import type { Message } from "@/app/types/message";
import { TeamPresenceProvider } from "@/app/components/presence/TeamPresenceProvider";

export default async function DashboardPage({
  searchParams,
}: TeamSearchPageProps) {
  const [{ user, error }, resolvedSearchParams] = await Promise.all([
    getCurrentIdentity(),
    searchParams,
  ]);

  if (!user || error) {
    redirect("/auth/login");
  }

  const requestedTeamId = getTeamIdFromSearchParams(resolvedSearchParams);

  const { activeTeamId, isRequestedTeamIdValid } = await getTeamContext(
    user.id,
    requestedTeamId,
  );

  if (requestedTeamId && !isRequestedTeamIdValid) {
    redirect("/teams");
  }

  if (!activeTeamId) {
    redirect("/teams");
  }

  const supabase = await createClient();
  const initialMessagesRequestedAt = new Date().toISOString();
  const [
    { data: memberRows, error: memberRowsError },
    { data: messageRows, error: messagesError },
  ] = await Promise.all([
    supabase
      .from("team_members")
      .select("user_id, name, email, avatar_url")
      .eq("team_id", activeTeamId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("messages")
      .select("id, team_id, content, user_id, user_name, inserted_at")
      .eq("team_id", activeTeamId)
      .order("inserted_at", { ascending: false })
      .limit(200),
  ]);

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
    <TeamPresenceProvider
      userId={user.id}
      teamIds={[activeTeamId]}
      defaultTeamId={activeTeamId}
    >
      <TeamChat
        key={activeTeamId}
        userId={user.id}
        userName={user.user_metadata?.full_name || user.email || "User"}
        teamId={activeTeamId}
        members={members}
        membersLoaded={!memberRowsError}
        initialMessages={((messageRows as Message[]) ?? []).reverse()}
        initialMessagesLoaded={!messagesError}
        initialMessagesRequestedAt={initialMessagesRequestedAt}
      />
    </TeamPresenceProvider>
  );
}
