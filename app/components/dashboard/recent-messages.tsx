import { createClient } from "@/app/lib/supabaseServer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamScopedProps } from "@/app/types/team";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
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
      <Card className="h-full gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-base">Recent Messages</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Messages could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-base">Recent Messages</CardTitle>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {messages.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            No recent messages.
          </p>
        ) : (
          messages.map((message) => {
            const senderName = message.user_name || "Team member";

            return (
              <div
                key={message.id}
                className="flex items-center gap-3 px-5 py-3"
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback>
                    {senderName
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part: string) => part[0]?.toUpperCase())
                      .join("") || "NA"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">
                      {senderName}
                    </p>
                    <time
                      dateTime={message.inserted_at}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {formatDate(message.inserted_at)}
                    </time>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {message.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
