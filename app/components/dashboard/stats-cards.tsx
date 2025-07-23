import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, Users, FileText } from "lucide-react";

const stats = [
  {
    title: "Toplam Görevler",
    value: "24",
    change: "+12%",
    icon: CheckSquare,
    color: "text-blue-600",
  },
  {
    title: "Tamamlanan",
    value: "18",
    change: "+8%",
    icon: Clock,
    color: "text-green-600",
  },
  {
    title: "Takım Üyeleri",
    value: "8",
    change: "+2",
    icon: Users,
    color: "text-purple-600",
  },
  {
    title: "Dosyalar",
    value: "156",
    change: "+24",
    icon: FileText,
    color: "text-orange-600",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stat.change}</span> geçen aydan
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
