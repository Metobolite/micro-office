import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const tasks = [
  {
    id: 1,
    title: "UI Design Review",
    status: "In Progress",
    priority: "High",
    assignee: {
      name: "John Doe",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    dueDate: "2024-01-15",
  },
  {
    id: 2,
    title: "Database Migration",
    status: "To Do",
    priority: "Medium",
    assignee: {
      name: "Jane Smith",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    dueDate: "2024-01-18",
  },
  {
    id: 3,
    title: "API Documentation",
    status: "Done",
    priority: "Low",
    assignee: {
      name: "Mike Johnson",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    dueDate: "2024-01-12",
  },
];

export function RecentTasks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Son Görevler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={task.assignee.avatar || "/placeholder.svg"} />
                <AvatarFallback>
                  {task.assignee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.dueDate}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={task.status === "Done" ? "default" : "secondary"}>
                {task.status}
              </Badge>
              <Badge
                variant={task.priority === "High" ? "destructive" : "outline"}
              >
                {task.priority}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
