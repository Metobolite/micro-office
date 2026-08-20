export type DashboardRouteMeta = {
  href: string;
  navigationTitle: string;
  title: string;
  teamSubtitle?: boolean;
  subtitle?: string;
};

export const DASHBOARD_ROUTES = {
  dashboard: {
    href: "/dashboard",
    navigationTitle: "Dashboard",
    title: "Dashboard",
    teamSubtitle: true,
    subtitle: "Workspace overview",
  },
  tasks: {
    href: "/dashboard/tasks",
    navigationTitle: "Tasks",
    title: "Tasks",
    teamSubtitle: true,
    subtitle: "Plan and track team work",
  },
  chat: {
    href: "/dashboard/chat",
    navigationTitle: "Chat",
    title: "Team Chat",
  },
  files: {
    href: "/dashboard/files",
    navigationTitle: "Files",
    title: "Files",
    teamSubtitle: true,
    subtitle: "Shared team files",
  },
  summaries: {
    href: "/dashboard/summaries",
    navigationTitle: "AI Summaries",
    title: "AI Summaries",
    teamSubtitle: true,
    subtitle: "Document workspace",
  },
  timeTracker: {
    href: "/dashboard/time-tracker",
    navigationTitle: "Time Tracking",
    title: "Time Tracking",
    teamSubtitle: true,
    subtitle: "Focus and time overview",
  },
  calendar: {
    href: "/dashboard/calendar",
    navigationTitle: "Calendar",
    title: "Calendar",
  },
  team: {
    href: "/dashboard/team",
    navigationTitle: "Team",
    title: "Team",
  },
  settings: {
    href: "/dashboard/settings",
    navigationTitle: "Settings",
    title: "Settings",
    subtitle: "Manage your profile, workspace and appearance.",
  },
} as const satisfies Record<string, DashboardRouteMeta>;

export const DASHBOARD_HEADER_ACTIONS_ID = "dashboard-header-actions";

const routesByPath = new Map<string, DashboardRouteMeta>(
  Object.values(DASHBOARD_ROUTES).map((route) => [route.href, route]),
);

export function getDashboardRoute(pathname: string): DashboardRouteMeta {
  return routesByPath.get(pathname) ?? DASHBOARD_ROUTES.dashboard;
}
