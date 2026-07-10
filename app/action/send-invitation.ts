"use server";

import { getAppUrl, sendTeamInvitationEmail } from "@/app/lib/email";
import {
  createInvitationToken,
  getInvitationExpiresAt,
  hashInvitationToken,
} from "@/app/lib/invitations";
import { createClient } from "@/app/lib/supabaseServer";

export async function sendInvitation(email: string, teamId: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !teamId) {
    return {
      success: false,
      message: "Email address or team information is missing.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must sign in to send an invitation.",
    };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .eq("team_id", teamId)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (!membership) {
    return {
      success: false,
      message: "You must be an owner or admin to invite people to this team.",
    };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .single();

  const { data: existingMember } = await supabase
    .from("team_members")
    .select("team_id, email")
    .eq("team_id", teamId)
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (existingMember) {
    return {
      success: false,
      message: "This email address is already a member of this team.",
    };
  }

  const { data: existingInvitation } = await supabase
    .from("team_invitations")
    .select("id")
    .eq("team_id", teamId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvitation) {
    return {
      success: false,
      message: "This email address has already been invited to this team.",
    };
  }

  const token = createInvitationToken();
  const { error: insertError } = await supabase.from("team_invitations").insert({
    team_id: teamId,
    email: normalizedEmail,
    role: "member",
    token_hash: hashInvitationToken(token),
    invited_by: user.id,
    expires_at: getInvitationExpiresAt(),
  });

  if (insertError) {
    console.error("Team invitation insert error:", insertError);

    return {
      success: false,
      message: `Invitation could not be saved: ${insertError.message}`,
    };
  }

  const teamName = team?.name || "Micro Office";
  const inviterName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "A team member";
  const emailResult = await sendTeamInvitationEmail({
    to: normalizedEmail,
    teamName,
    inviterName,
    inviteUrl: `${getAppUrl()}/invite/${token}`,
  });

  if (!emailResult.success) {
    return {
      success: false,
      inviteCreated: true,
      message: `Invitation was saved, but the email could not be sent: ${emailResult.message}`,
    };
  }

  return {
    success: true,
    message: "Invitation was saved and the email was sent.",
  };
}
