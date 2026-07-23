"use client";

import {
  BookOpenText,
  Calendar,
  CheckSquare,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Timer,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DASHBOARD_ROUTES } from "@/app/lib/dashboard-routes";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "../../components/ui/sidebar";
import { ThemeToggle } from "./theme/theme-toggle";

type NavigationItem = {
  title: string;
  icon: LucideIcon;
  url?: string;
};

const navigation: Array<{
  title: string;
  items: NavigationItem[];
}> = [
  {
    title: "Main",
    items: [
      {
        title: DASHBOARD_ROUTES.dashboard.navigationTitle,
        url: DASHBOARD_ROUTES.dashboard.href,
        icon: Home,
      },
      {
        title: DASHBOARD_ROUTES.tasks.navigationTitle,
        url: DASHBOARD_ROUTES.tasks.href,
        icon: CheckSquare,
      },
      {
        title: DASHBOARD_ROUTES.chat.navigationTitle,
        url: DASHBOARD_ROUTES.chat.href,
        icon: MessageSquare,
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        title: DASHBOARD_ROUTES.files.navigationTitle,
        url: DASHBOARD_ROUTES.files.href,
        icon: FileText,
      },
      {
        title: DASHBOARD_ROUTES.summaries.navigationTitle,
        url: DASHBOARD_ROUTES.summaries.href,
        icon: BookOpenText,
      },
      {
        title: DASHBOARD_ROUTES.timeTracker.navigationTitle,
        url: DASHBOARD_ROUTES.timeTracker.href,
        icon: Timer,
      },
      {
        title: DASHBOARD_ROUTES.calendar.navigationTitle,
        url: DASHBOARD_ROUTES.calendar.href,
        icon: Calendar,
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        title: DASHBOARD_ROUTES.team.navigationTitle,
        url: DASHBOARD_ROUTES.team.href,
        icon: Users,
      },
      {
        title: DASHBOARD_ROUTES.settings.navigationTitle,
        url: DASHBOARD_ROUTES.settings.href,
        icon: Settings,
      },
      { title: "Logout", icon: LogOut },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTeamId = searchParams.get("teamId");

  const withTeamId = (url?: string) => {
    if (!url || !activeTeamId || !url.startsWith("/dashboard")) {
      return url;
    }

    return `${url}${url.includes("?") ? "&" : "?"}teamId=${activeTeamId}`;
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4 bg-accent">
        <div className="flex items-center justify-between">
          <Link href="/teams" className="text-lg font-semibold">
            Micro Office
          </Link>
          <ThemeToggle className="size-8" />
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-accent">
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.url ? (
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                      >
                        <Link href={withTeamId(item.url) ?? item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <form action="/auth/logout" method="post">
                        <SidebarMenuButton type="submit">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </form>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
