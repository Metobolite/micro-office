import { createClient } from "@/app/lib/supabaseServer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamScopedProps } from "@/app/types/team";

function formatLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export async function TeamMembers({ teamId }: TeamScopedProps) {
  const supabase = await createClient();

  const { data: teamMembers, error } = await supabase
    .from("team_members")
    .select("user_id, role, status, name, email, avatar_url")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: false })
    .limit(4);

  if (error || !teamMembers) {
    return (
      <Card className="h-full gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Members could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-base">Team Members</CardTitle>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {teamMembers.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            No team members yet.
          </p>
        ) : (
          teamMembers.map((member) => {
            const displayName = member.name || member.email || "Member";
            const status = member.status || "offline";

            return (
              <div
                key={member.user_id || member.email || displayName}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarImage
                      src={member.avatar_url || undefined}
                      alt=""
                    />
                    <AvatarFallback>
                      {displayName
                        .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase() || "NA"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatLabel(member.role || "member")}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 gap-1.5 font-normal"
                >
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-full ${
                      status === "online"
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/50"
                    }`}
                  />
                  {formatLabel(status)}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
