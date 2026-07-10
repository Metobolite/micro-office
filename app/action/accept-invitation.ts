"use server";

import { hashInvitationToken } from "@/app/lib/invitations";
import { createClient } from "@/app/lib/supabaseServer";
import { redirect } from "next/navigation";

type TeamInvitationRow = {
  id: string;
  team_id: string;
  email: string;
  role: string | null;
  status: string;
  expires_at: string;
};

export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/invite/${token}`);
  }

  const userEmail = user.email?.trim().toLowerCase();

  if (!userEmail) {
    redirect(`/invite/${token}?error=email`);
  }

  const { data: invitation, error: invitationError } = await supabase
    .from("team_invitations")
    .select("id, team_id, email, role, status, expires_at")
    .eq("token_hash", hashInvitationToken(token))
    .maybeSingle<TeamInvitationRow>();

  if (invitationError || !invitation) {
    redirect(`/invite/${token}?error=invalid`);
  }

  if (invitation.email.toLowerCase() !== userEmail) {
    redirect(`/invite/${token}?error=mismatch`);
  }

  if (invitation.status !== "pending") {
    redirect(`/invite/${token}?error=used`);
  }

  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    await supabase
      .from("team_invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);

    redirect(`/invite/${token}?error=expired`);
  }

  const { data: existingMembership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("team_id", invitation.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMembership) {
    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: invitation.team_id,
      user_id: user.id,
      role: invitation.role || "member",
      name: user.user_metadata?.full_name || user.user_metadata?.name || "",
      email: userEmail,
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      console.error("Accept invitation member insert error:", memberError);
      redirect(`/invite/${token}?error=membership`);
    }
  }

  const { error: updateError } = await supabase
    .from("team_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invitation.id);

  if (updateError) {
    console.error("Accept invitation update error:", updateError);
    redirect(`/invite/${token}?error=accept`);
  }

  redirect(`/dashboard?teamId=${invitation.team_id}`);
}
