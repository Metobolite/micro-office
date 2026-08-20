"use server";

import { getAppUrl, sendTeamInvitationEmail } from "@/app/lib/email";
import {
  createInvitationToken,
  getInvitationExpiresAt,
  hashInvitationToken,
  isValidInvitationEmail,
  isInvitationRole,
  isValidTeamId,
} from "@/app/lib/invitations";
import {
  createClient,
  getCurrentIdentity,
} from "@/app/lib/supabaseServer";

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
  const normalizedTeamId = teamId.trim();

  if (
    !isValidInvitationEmail(normalizedEmail) ||
    !isValidTeamId(normalizedTeamId)
  ) {
    return {
      success: false,
      message: "Enter a valid email address and workspace.",
    };
  }

  const supabase = await createClient();
  const { user } = await getCurrentIdentity();

  if (!user) {
    return {
      success: false,
      message: "You must sign in to send an invitation.",
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("team_id", normalizedTeamId)
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

  const [teamResult, memberResult, invitationResult] = await Promise.all([
    supabase
      .from("teams")
      .select("name")
      .eq("id", normalizedTeamId)
      .single(),
    supabase
      .from("team_members")
      .select("team_id")
      .eq("team_id", normalizedTeamId)
      .ilike("email", normalizedEmail)
      .maybeSingle(),
    supabase
      .from("team_invitations")
      .select("id")
      .eq("team_id", normalizedTeamId)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  const lookupError =
    teamResult.error || memberResult.error || invitationResult.error;

  if (lookupError) {
    console.error("Invitation lookup error:", lookupError);
    return {
      success: false,
      message: "Invitation information could not be verified.",
    };
  }

  const team = teamResult.data;
  const existingMember = memberResult.data;
  const existingInvitation = invitationResult.data;

  if (existingMember) {
    return {
      success: false,
      message: "This email address is already a member of this team.",
    };
  }

  if (existingInvitation) {
    return {
      success: false,
      message: "This email address has already been invited to this team.",
    };
  }

  const token = createInvitationToken();
  const { error: insertError } = await supabase.from("team_invitations").insert({
    team_id: normalizedTeamId,
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
      message:
        insertError.code === "23505"
          ? "This email address has already been invited to this team."
          : "Invitation could not be sent. Please try again.",
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
    console.error("Team invitation email error:", emailResult.message);
    return {
      success: false,
      inviteCreated: true,
      message:
        "Invitation was saved, but the email could not be sent. Please try again later.",
    };
  }

  return {
    success: true,
    message: "Invitation was saved and the email was sent.",
  };
}
