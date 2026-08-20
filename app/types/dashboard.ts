export type DashboardUser = {
  name: string;
  customAvatarUrl: string | null;
  providerAvatarUrl: string | null;
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
