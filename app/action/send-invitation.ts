"use server";

import { getAppUrl, sendTeamInvitationEmail } from "@/app/lib/email";
import {
  createInvitationToken,
  getInvitationExpiresAt,
  hashInvitationToken,
  isInvitationRole,
} from "@/app/lib/invitations";
import { createClient } from "@/app/lib/supabaseServer";

export async function sendInvitation(
  email: unknown,
  teamId: unknown,
  role: unknown,
) {
  if (
    typeof email !== "string" ||
    typeof teamId !== "string" ||
    !isInvitationRole(role)
  ) {
    return {
      success: false,
      message: "Invitation information is invalid.",
    };
  }

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

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .eq("team_id", teamId)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (membershipError) {
    console.error("Invitation permission check error:", membershipError);
    return {
      success: false,
      message: "Your invitation permissions could not be verified.",
    };
  }

  if (!membership) {
    return {
      success: false,
      message: "You must be an owner or admin to invite people to this team.",
    };
  }

  if (membership.role !== "owner" && role === "admin") {
    return {
      success: false,
      message: "Only the workspace owner can invite an admin.",
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
    role,
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
    role,
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
