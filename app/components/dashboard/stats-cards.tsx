import { createClient } from "@/app/lib/supabaseServer";
import { Card, CardContent } from "@/components/ui/card";
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
      iconClassName:
        "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    },
    {
      title: "Completed",
      value: completedTaskCount ?? 0,
      icon: CheckSquare,
      iconClassName:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Team Members",
      value: teamMemberCount ?? 0,
      icon: Users,
      iconClassName:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Files",
      value: fileCount ?? 0,
      icon: FileText,
      iconClassName:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <section
      aria-label="Workspace overview"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {stats.map((stat) => (
        <Card key={stat.title} className="gap-0 py-0 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${stat.iconClassName}`}
            >
              <stat.icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                {stat.title}
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {stat.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
