import { createClient } from "@/app/lib/supabaseServer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, FileText, Users } from "lucide-react";
import type { TeamScopedProps } from "@/app/types/team";

export default async function StatsCards({ teamId }: TeamScopedProps) {
  const supabase = await createClient();

  const [
    { count: totalTaskCount },
    { count: completedTaskCount },
    { count: teamMemberCount },
    { count: fileCount },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("status", "done"),
    supabase
      .from("team_members")
      .select("team_id", { count: "exact", head: true })
      .eq("team_id", teamId),
    supabase
      .from("files")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
  ]);

  const stats = [
    {
      title: "Total Tasks",
      value: totalTaskCount ?? 0,
      icon: Clock,
      color: "text-blue-600",
    },
    {
      title: "Completed",
      value: completedTaskCount ?? 0,
      icon: CheckSquare,
      color: "text-green-600",
    },
    {
      title: "Team Members",
      value: teamMemberCount ?? 0,
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Files",
      value: fileCount ?? 0,
      icon: FileText,
      color: "text-orange-600",
    },
  ];

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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
