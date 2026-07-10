"use client";

import {
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
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { ThemeToggle } from "./theme";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTeamId = searchParams.get("teamId");

  const handleLogout = async () => {
    const res = await fetch("/auth/logout", {
      method: "POST",
    });

    if (res.redirected) {
      router.push(res.url);
    } else {
      router.push("/auth/login");
    }
  };

  const navigation = [
    {
      title: "Main",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: Home },
        { title: "Tasks", url: "/dashboard/tasks", icon: CheckSquare },
        { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
      ],
    },
    {
      title: "Tools",
      items: [
        { title: "Files", url: "/dashboard/files", icon: FileText },
        { title: "Time Tracking", url: "/dashboard/time-tracker", icon: Timer },
        { title: "Calendar", url: "/dashboard/calendar", icon: Calendar },
      ],
    },
    {
      title: "Settings",
      items: [
        { title: "Team", url: "/dashboard/team", icon: Users },
        { title: "Profile", url: "/settings", icon: Settings },
        { title: "Logout", icon: LogOut, onClick: handleLogout },
      ],
    },
  ];

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
                    {item.onClick ? (
                      <SidebarMenuButton onClick={item.onClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                      >
                        <Link href={withTeamId(item.url) ?? item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
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
