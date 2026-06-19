import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/app/lib/supabaseServer";

export async function TeamMembers({ teamId }: { teamId: string }) {
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
          <CardTitle>Takım Üyeleri</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Üyeler yüklenemedi.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Takım Üyeleri</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teamMembers.map((member) => (
          <div
            key={member.user_id || member.email || member.name}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>
                    {member.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "NA"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
                    member.status === "online"
                      ? "bg-green-500"
                      : member.status === "away"
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
            </div>
            <Badge
              variant={member.status === "online" ? "default" : "secondary"}
            >
              {member.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
