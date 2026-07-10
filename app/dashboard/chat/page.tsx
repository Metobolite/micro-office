import { createClient } from "../../lib/supabaseServer";
import TeamChat from "../../components/chat/TeamChat";
import { redirect } from "next/navigation";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
  type TeamSearchParams,
} from "@/app/lib/team-context";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<TeamSearchParams>;
}) {
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

  return (
    <TeamChat
      userId={user.id}
      userName={user.user_metadata?.full_name || user.email || "User"}
      teamId={activeTeamId}
    />
  );
}
