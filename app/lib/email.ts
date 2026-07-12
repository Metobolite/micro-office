import type {
  SendEmailResult,
  SendTeamInvitationEmailParams,
} from "@/app/types/invitation";

const RESEND_EMAIL_API_URL = "https://api.resend.com/emails";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSenderEmail() {
  return process.env.RESEND_FROM_EMAIL || "Micro Office <onboarding@resend.dev>";
}

export function getAppUrl() {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null;

  return (appUrl || vercelUrl || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendTeamInvitationEmail({
  to,
  teamName,
  inviterName,
  inviteUrl,
  role,
}: SendTeamInvitationEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: "The RESEND_API_KEY environment variable is not set.",
    };
  }

  const safeTeamName = escapeHtml(teamName);
  const safeInviterName = escapeHtml(inviterName);
  const safeInviteUrl = escapeHtml(inviteUrl);
  const roleLabel = role === "admin" ? "Admin" : "Member";

  let response: Response;

  try {
    response = await fetch(RESEND_EMAIL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getSenderEmail(),
        to: [to],
        subject: `You have been invited to ${teamName}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h1 style="font-size: 22px; margin-bottom: 12px;">Micro Office invitation</h1>
            <p>${safeInviterName} invited you to join <strong>${safeTeamName}</strong>.</p>
            <p>Your workspace role will be <strong>${roleLabel}</strong>.</p>
            <p style="margin: 24px 0;">
              <a href="${safeInviteUrl}" style="background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none;">
                Open invitation
              </a>
            </p>
            <p>If the button does not work, open this link in your browser:</p>
            <p><a href="${safeInviteUrl}">${safeInviteUrl}</a></p>
          </div>
        `,
        text: `${inviterName} invited you to join ${teamName} as ${roleLabel}.\n\nOpen invitation: ${inviteUrl}`,
      }),
    });
  } catch {
    return {
      success: false,
      message: "The email service could not be reached.",
    };
  }

  if (!response.ok) {
    return {
      success: false,
      message: `The email could not be sent. Resend status code: ${response.status}`,
    };
  }

  return { success: true };
}
