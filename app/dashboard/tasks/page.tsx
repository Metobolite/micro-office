import { redirect } from "next/navigation";
import TasksPageClient from "../../components/tasks/TasksPageClient";
import { createClient } from "../../lib/supabaseServer";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function TasksPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { data: teamMember, error: teamError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!teamMember || teamError) {
    redirect("/create-team");
  }

  return (
    <div>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">Görevler</h1>
        </div>
      </header>
      <TasksPageClient userId={user.id} teamId={teamMember.team_id} />
    </div>
  );
}
