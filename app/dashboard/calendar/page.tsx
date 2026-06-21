import { redirect } from "next/navigation";
import Calendar from "../../components/calendar/Calendar";
import { createClient } from "../../lib/supabaseServer";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";

export default async function CalendarPage({
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
    <div>
      <Calendar userId={user.id} teamId={activeTeamId} />
    </div>
  );
}
