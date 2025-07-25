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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
      { title: "Zaman Takibi", url: "/dashboard/timer", icon: Timer },
      { title: "Takvim", url: "/dashboard/calendar", icon: Calendar },
    ],
  },
  {
    title: "Ayarlar",
    items: [
      { title: "Takım", url: "/team", icon: Users },
      { title: "Profil", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ProjectHub</h2>
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
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
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
