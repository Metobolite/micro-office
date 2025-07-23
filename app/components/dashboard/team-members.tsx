import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const teamMembers = [
  {
    name: "John Doe",
    role: "Frontend Developer",
    status: "online",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    name: "Jane Smith",
    role: "Backend Developer",
    status: "away",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    name: "Mike Johnson",
    role: "UI/UX Designer",
    status: "online",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    name: "Sarah Wilson",
    role: "Project Manager",
    status: "offline",
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

export function TeamMembers() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Takım Üyeleri</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teamMembers.map((member) => (
          <div key={member.name} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar || "/placeholder.svg"} />
                  <AvatarFallback>
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
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
            <Badge variant={member.status === "online" ? "default" : "secondary"}>{member.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
