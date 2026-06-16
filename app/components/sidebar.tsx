"use client";

import {
  Calendar,
  FileText,
  Home,
  MessageSquare,
  Settings,
  Timer,
  CheckSquare,
  Users,
  LogOut,
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
      title: "Ana Sayfa",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: Home },
        { title: "Görevler", url: "/dashboard/tasks", icon: CheckSquare },
        { title: "Sohbet", url: "/dashboard/chat", icon: MessageSquare },
      ],
    },
    {
      title: "Araçlar",
      items: [
        { title: "Dosyalar", url: "/dashboard/files", icon: FileText },
        { title: "Zaman Takibi", url: "/dashboard/time-tracker", icon: Timer },
        { title: "Takvim", url: "/dashboard/calendar", icon: Calendar },
      ],
    },
    {
      title: "Ayarlar",
      items: [
        { title: "Takım", url: "/dashboard/team", icon: Users },
        { title: "Profil", url: "/settings", icon: Settings },
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
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Micro Office</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
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
