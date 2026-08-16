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
import {
  CALENDAR_UPCOMING_LIMIT,
  getCalendarGridRange,
  toCalendarDateKey,
  type EventType,
} from "@/app/types/EventType";

const EVENT_COLUMNS =
  "id, title, description, type, date, time, duration, attendees";

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

  const initialDate = new Date();
  const initialYear = initialDate.getFullYear();
  const initialMonth = initialDate.getMonth();
  const { startDate, endDate } = getCalendarGridRange(
    initialYear,
    initialMonth,
  );
  const todayDate = toCalendarDateKey(initialDate);
  const supabase = await createClient();
  const [rangeResult, todayResult, upcomingResult] = await Promise.all([
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("team_id", activeTeamId)
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("time", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true }),
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("team_id", activeTeamId)
      .eq("user_id", user.id)
      .eq("date", todayDate)
      .order("time", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(CALENDAR_UPCOMING_LIMIT),
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("team_id", activeTeamId)
      .eq("user_id", user.id)
      .gt("date", todayDate)
      .order("date", { ascending: true })
      .order("time", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(CALENDAR_UPCOMING_LIMIT),
  ]);

  return (
    <Calendar
      key={activeTeamId}
      userId={user.id}
      teamId={activeTeamId}
      initialRangeEvents={(rangeResult.data as EventType[]) ?? []}
      initialTodayEvents={(todayResult.data as EventType[]) ?? []}
      initialUpcomingEvents={(upcomingResult.data as EventType[]) ?? []}
      initialYear={initialYear}
      initialMonth={initialMonth}
      initialTodayDate={todayDate}
    />
  );
}
