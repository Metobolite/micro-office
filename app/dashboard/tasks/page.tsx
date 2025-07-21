import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { redirect } from "next/navigation";
import TasksPageClient from "../../components/TasksPageClient";
import { createClient } from "../../lib/supabaseServer";
export default async function TasksPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  return (
    <TasksPageClient
      userId={user.id}
      userName={user.user_metadata.full_name || user.email}
    />
  );
}
