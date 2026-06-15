import { redirect } from "next/navigation";
import Calendar from "../../components/calendar/Calendar";
import { createClient } from "../../lib/supabaseServer";

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { data: teamMember, error: teamError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!teamMember || teamError) {
    redirect("/create-team");
  }

  return (
    <div>
      <Calendar userId={user.id} teamId={teamMember.team_id} />
    </div>
  );
}
