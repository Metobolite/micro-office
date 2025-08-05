import { createClient } from "../../lib/supabaseServer";
import TeamChat from "../../components/chat/TeamChat";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
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
    <TeamChat
      userId={user.id}
      userName={user.user_metadata.full_name || user.email}
      teamId={teamMember.team_id}
    />
  );
}
