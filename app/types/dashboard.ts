export type DashboardUser = {
  name: string;
  avatarUrl: string | null;
};

export type DashboardHeaderProps = {
  user: DashboardUser;
  teamName?: string | null;
};
