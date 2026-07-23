import { redirect } from "next/navigation";
import Calendar from "../../components/calendar/Calendar";
import {
  createClient,
  getCurrentIdentity,
} from "../../lib/supabaseServer";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import type { TeamSearchPageProps } from "@/app/types/team";
import type { EventType } from "@/app/types/EventType";

export default async function CalendarPage({
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
  const { data: events } = await supabase
    .from("events")
    .select("id, title, description, type, date, time, duration, attendees")
    .eq("team_id", activeTeamId)
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  return (
    <Calendar
      key={activeTeamId}
      userId={user.id}
      teamId={activeTeamId}
      initialEvents={(events as EventType[]) ?? []}
    />
  );
}
