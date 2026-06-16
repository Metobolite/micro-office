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

  const { activeTeamId } = await getTeamContext(
    supabase,
    user.id,
    getTeamIdFromSearchParams(searchParams),
  );

  if (!activeTeamId) {
    redirect("/create-team");
  }

  return (
    <div>
      <Calendar userId={user.id} teamId={activeTeamId} />
    </div>
  );
}
