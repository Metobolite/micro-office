import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import TeamChat from "../../components/TeamChat";

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies: () => cookies() });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="text-center mt-10">Lütfen giriş yapın.</div>;
  }

  return (
    <TeamChat
      userId={user.id}
      userName={user.user_metadata.full_name || user.email}
    />
  );
}
