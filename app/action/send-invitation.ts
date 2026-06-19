"use server";

import { createClient } from "@/app/lib/supabaseServer";

export async function sendInvitation(email: string) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  const { data: teams } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .limit(1);

  const team_id = teams?.[0]?.team_id;
  if (!team_id) return;

  await supabase.from("team_members").insert({
    team_id,
    email,
    status: "invited",
    role: "member",
    joined_at: new Date().toISOString(),
  });

  // Burada istersen SendGrid, Resend, Supabase functions vb. kullanarak e-posta gönderebilirsin
}
