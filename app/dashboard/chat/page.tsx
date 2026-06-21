import { createClient } from "../../lib/supabaseServer";
import TeamChat from "../../components/chat/TeamChat";
import { redirect } from "next/navigation";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { teamId?: string | string[] };
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const requestedTeamId = getTeamIdFromSearchParams(searchParams);

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
      userName={user.user_metadata.full_name || user.email}
      teamId={activeTeamId}
    />
  );
}
