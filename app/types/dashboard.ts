export type DashboardUser = {
  name: string;
  avatarUrl: string | null;
};

export type DashboardTeam = {
  id: string;
  name: string | null;
};

export type DashboardHeaderProps = {
  user: DashboardUser;
  teams: DashboardTeam[];
};
