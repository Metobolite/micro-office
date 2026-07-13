"use server";

import { hashInvitationToken } from "@/app/lib/invitations";
import { createClient } from "@/app/lib/supabaseServer";
import type { TeamInvitationRow } from "@/app/types/invitation";
import { redirect } from "next/navigation";

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
    .select("team_id, email, status, expires_at")
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
    redirect(`/invite/${token}?error=expired`);
  }

  const { data: acceptedTeamId, error: acceptError } = await supabase.rpc(
    "accept_team_invitation_with_role",
    { invitation_token_hash: hashInvitationToken(token) },
  );

  if (acceptError || !acceptedTeamId) {
    console.error("Accept invitation RPC error:", acceptError);
    redirect(`/invite/${token}?error=accept`);
  }

  redirect(`/dashboard?teamId=${acceptedTeamId}`);
}
