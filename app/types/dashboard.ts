export type DashboardUser = {
  name: string;
  customAvatarUrl: string | null;
  providerAvatarUrl: string | null;
  membershipAvatarUrls: string[];
};

export type DashboardTeam = {
  id: string;
  name: string | null;
};

export type DashboardHeaderProps = {
  user: DashboardUser;
  teams: DashboardTeam[];
  activeTeamId: string | null;
};
