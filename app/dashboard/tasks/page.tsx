import { redirect } from "next/navigation";
import TasksPageClient from "../../components/tasks/TasksPageClient";
import { createClient } from "../../lib/supabaseServer";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: { teamId?: string | string[] };
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { activeTeamId } = await getTeamContext(
    supabase,
    user.id,
    getTeamIdFromSearchParams(searchParams),
  );

  if (!activeTeamId) {
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
      <TasksPageClient userId={user.id} teamId={activeTeamId} />
    </div>
  );
}
