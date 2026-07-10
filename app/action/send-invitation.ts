"use server";

import { createClient } from "@/app/lib/supabaseServer";

export async function sendInvitation(email: string, teamId: string) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail || !teamId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("team_id", teamId)
    .limit(1);

  if (!memberships?.length) return;

  await supabase.from("team_members").insert({
    team_id: teamId,
    email: trimmedEmail,
    status: "invited",
    role: "member",
    joined_at: new Date().toISOString(),
  });

  // Burada istersen SendGrid, Resend, Supabase functions vb. kullanarak e-posta gönderebilirsin
}
