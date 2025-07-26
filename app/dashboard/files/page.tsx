// app/files/page.tsx

import { createClient } from "@/app/lib/supabaseServer";
import { FilesPage } from "@/app/components/FilesPage";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return <div className="text-center mt-10">Lütfen giriş yapın.</div>;
  }

  return (
    <FilesPage
      userId={user.id}
      userName={user.user_metadata?.full_name || user.email || "Kullanıcı"}
    />
  );
}
