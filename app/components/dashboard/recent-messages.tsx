import { createClient } from "@/app/lib/supabaseServer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamScopedProps } from "@/app/types/team";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function RecentMessages({ teamId }: TeamScopedProps) {
  const supabase = await createClient();

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, user_name, content, inserted_at")
    .eq("team_id", teamId)
    .order("inserted_at", { ascending: false })
    .limit(4);

  if (error || !messages) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Messages could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {message.user_name
                  ?.split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part: string) => part[0]?.toUpperCase())
                  .join("") || "NA"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{message.user_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(message.inserted_at)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {message.content}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
