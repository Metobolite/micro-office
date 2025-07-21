import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { redirect } from "next/navigation";
import TasksPageClient from "../../components/TasksPageClient";

export default async function TasksPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <TasksPageClient
      userId={user.id}
      userName={user.user_metadata.full_name || user.email}
    />
  );
}
