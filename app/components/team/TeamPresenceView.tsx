"use client";

import { useTeamPresence } from "@/app/components/presence/TeamPresenceProvider";
import type {
  TeamMemberPresenceCard,
  TeamPresenceStatus,
} from "@/app/types/presence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MoreHorizontal, Phone } from "lucide-react";

type TeamPresenceViewProps = {
  members: TeamMemberPresenceCard[];
  teamId: string;
};

const statusStyles: Record<TeamPresenceStatus, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-muted-foreground/50",
};

const statusLabels: Record<TeamPresenceStatus, string> = {
  online: "Online",
  away: "Away",
  offline: "Offline",
};

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "NA"
  );
}

export function TeamPresenceView({ members, teamId }: TeamPresenceViewProps) {
  const { statusByUserId, connection, errorMessage, isSynced } =
    useTeamPresence(teamId);
  const getMemberStatus = (userId: string | null): TeamPresenceStatus =>
    (userId && statusByUserId[userId]) || "offline";
  const onlineCount = members.filter(
    (member) => getMemberStatus(member.userId) === "online",
  ).length;
  const awayCount = members.filter(
    (member) => getMemberStatus(member.userId) === "away",
  ).length;
  const offlineCount = members.length - onlineCount - awayCount;
  const liveLabel =
    connection === "error"
      ? "Presence unavailable"
      : isSynced
        ? "Live"
        : "Connecting";

  return (
    <div className="flex-1 space-y-6 overflow-auto p-6">
      <div className="flex items-center justify-end" aria-live="polite">
        <span
          className="inline-flex max-w-full items-center gap-2 text-xs text-muted-foreground"
          title={errorMessage ?? undefined}
        >
          <span
            className={`size-2 rounded-full ${
              isSynced
                ? "bg-emerald-500"
                : connection === "error"
                  ? "bg-destructive"
                  : "animate-pulse bg-amber-500"
            }`}
          />
          <span className="max-w-80 truncate">{liveLabel}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isSynced ? onlineCount : "—"}
            </div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {isSynced ? awayCount : "—"}
            </div>
            <p className="text-sm text-muted-foreground">Away</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {isSynced ? offlineCount : "—"}
            </div>
            <p className="text-sm text-muted-foreground">Offline</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((member) => {
          const status = getMemberStatus(member.userId);
          const displayStatus = isSynced
            ? statusLabels[status]
            : connection === "error"
              ? "Unavailable"
              : "Connecting";

          return (
            <Card
              key={`${member.teamId}-${member.userId ?? member.email}`}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={member.avatarUrl ?? undefined} />
                      <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <span
                      aria-label={displayStatus}
                      className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-background ${
                        isSynced
                          ? statusStyles[status]
                          : connection === "error"
                            ? "bg-destructive"
                            : "animate-pulse bg-amber-500"
                      }`}
                      title={displayStatus}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Actions for ${member.name}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <div className="mt-1 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>{member.role}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className={`size-1.5 rounded-full ${
                          isSynced
                            ? statusStyles[status]
                            : "bg-muted-foreground/50"
                        }`}
                      />
                      {displayStatus}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{member.phone}</span>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground">
                    Joined: {member.joinedLabel}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
