import { createClient } from "@/app/lib/supabaseServer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamScopedProps } from "@/app/types/team";

export async function TeamMembers({ teamId }: TeamScopedProps) {
  const supabase = await createClient();

  const { data: teamMembers, error } = await supabase
    .from("team_members")
    .select("user_id, role, status, name, email, avatar_url, joined_at")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: false });

  if (error || !teamMembers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Members could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teamMembers.map((member) => {
          const displayName = member.name || member.email || "Member";

          return (
            <div
              key={member.user_id || member.email || displayName}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback>
                    {displayName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "NA"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.role}
                  </p>
                </div>
              </div>
              <Badge
                variant={member.status === "online" ? "default" : "secondary"}
              >
                {member.status}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
