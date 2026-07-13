import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DashboardHeaderProps } from "@/app/types/dashboard";

export function DashboardHeader({
  user,
  teamName,
}: DashboardHeaderProps) {
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          {teamName ? (
            <p className="text-xs text-muted-foreground">{teamName}</p>
          ) : null}
        </div>
        <div className="flex items-center">
          <Avatar className="size-9 border bg-card shadow-xs">
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
