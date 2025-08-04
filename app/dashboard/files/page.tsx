// app/files/page.tsx

import { createClient } from "@/app/lib/supabaseServer";
import { FilesPage } from "@/app/components/files/FilesPage";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  return (
    <FilesPage
      userId={user.id}
      userName={user.user_metadata?.full_name || user.email || "Kullanıcı"}
    />
  );
}
