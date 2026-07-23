"use client";

import {
  DASHBOARD_HEADER_ACTIONS_ID,
  getDashboardRoute,
} from "@/app/lib/dashboard-routes";
import type { DashboardHeaderProps } from "@/app/types/dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname, useSearchParams } from "next/navigation";

export function DashboardHeader({
  user,
  teams,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = getDashboardRoute(pathname);
  const requestedTeamId = searchParams.get("teamId");
  const activeTeam =
    teams.find((team) => team.id === requestedTeamId) ?? teams[0] ?? null;
  const subtitle = route.teamSubtitle
    ? activeTeam?.name || route.subtitle
    : route.subtitle;
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-accent px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0" aria-live="polite">
          <h1 className="truncate text-xl font-semibold">{route.title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div
            id={DASHBOARD_HEADER_ACTIONS_ID}
            className="flex items-center gap-2"
          />
          <Avatar
            className="size-9 border bg-card shadow-xs"
            title={user.name}
          >
            <AvatarImage
              src={user.avatarUrl || undefined}
              alt={`${user.name} profile image`}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
