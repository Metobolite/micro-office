import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const messages = [
  {
    id: 1,
    user: "John Doe",
    message: "UI tasarımı hazır, inceleme için gönderiyorum.",
    time: "5 dk önce",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 2,
    user: "Jane Smith",
    message: "Database migration tamamlandı.",
    time: "15 dk önce",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 3,
    user: "Mike Johnson",
    message: "Toplantı saat 14:00'da başlayacak.",
    time: "1 saat önce",
    avatar: "/placeholder.svg?height=32&width=32",
  },
];

export function RecentMessages() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Son Mesajlar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {message.user
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{message.user}</p>
                <p className="text-xs text-muted-foreground">{message.time}</p>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {message.message}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
