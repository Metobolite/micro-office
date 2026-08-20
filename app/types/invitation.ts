import type { TeamRole } from "@/app/types/team";

export type InvitationRole = Exclude<TeamRole, "owner">;

export type TeamInvitationRow = {
  email: string;
  status: string;
  expires_at: string;
};

export type InvitePageParams = {
  token: string;
};

export type InvitePageSearchParams = {
  error?: string | string[];
};

export type InvitePageProps = {
  params: Promise<InvitePageParams>;
  searchParams?: Promise<InvitePageSearchParams>;
};

export type InvitationTeamData =
  | { name: string | null }
  | { name: string | null }[];

export type SendTeamInvitationEmailParams = {
  to: string;
  teamName: string;
  inviterName: string;
  inviteUrl: string;
  role: InvitationRole;
};

export type SendEmailResult =
  | { success: true }
  | { success: false; message: string };
