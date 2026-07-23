export type TeamRole = "owner" | "admin" | "member";

export type TeamRecord = {
  id: string;
  name: string | null;
};

export type TeamMembershipRecord = {
  team_id: string;
  role: string | null;
  status: string | null;
  joined_at: string | null;
  user_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  teams?: TeamRecord | TeamRecord[] | null;
};

export type TeamContext = {
  memberships: TeamMembershipRecord[];
  teamIds: string[];
  activeTeamId: string | null;
  isRequestedTeamIdValid: boolean;
};

export type TeamSearchParams = {
  teamId?: string | string[];
};

export type TeamSearchPageProps = {
  searchParams?: Promise<TeamSearchParams>;
};

export type TeamScopedProps = {
  teamId: string;
};

export type TeamMembershipSummary = Pick<
  TeamMembershipRecord,
  "team_id" | "role" | "status" | "joined_at"
>;

export type TeamListItem = TeamRecord &
  TeamMembershipSummary & {
    joinedLabel: string;
    statusLabel: string;
  };

export type AddTeamMemberFormProps = {
  teamId: string;
  inviterRole: Extract<TeamRole, "owner" | "admin">;
};

export type CreateTeamFormProps = {
  userId: string;
  userName: string;
  userEmail: string;
};
