import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/app/lib/supabaseServer";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function RecentMessages({ teamId }: { teamId: string }) {
  const supabase = await createClient();

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("team_id", teamId)
    .order("inserted_at", { ascending: false })
    .limit(4);

  if (error || !messages) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Son Görevler</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Görevler yüklenemedi.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Son Mesajlar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={message.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {message.user_name
                  ?.split(" ")
                  .map((n: string) => n[0])
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
