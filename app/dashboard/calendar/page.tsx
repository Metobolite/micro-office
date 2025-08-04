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

  return (
    <div>
      <Calendar />
    </div>
  );
}
