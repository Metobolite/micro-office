import { createClient } from "../../lib/supabaseServer";
import TeamChat from "../../components/TeamChat";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return <div className="text-center mt-10">Lütfen giriş yapın.</div>;
  }

  return (
    <TeamChat
      userId={user.id}
      userName={user.user_metadata.full_name || user.email}
    />
  );
}
