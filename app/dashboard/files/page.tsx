// app/files/page.tsx

import { createClient } from "@/app/lib/supabaseServer";
import { FilesPage } from "@/app/components/files/FilesPage";
import { redirect } from "next/navigation";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
  type TeamSearchParams,
} from "@/app/lib/team-context";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<TeamSearchParams>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedTeamId = getTeamIdFromSearchParams(resolvedSearchParams);

  const { activeTeamId, isRequestedTeamIdValid } = await getTeamContext(
    supabase,
    user.id,
    requestedTeamId,
  );

  if (requestedTeamId && !isRequestedTeamIdValid) {
    redirect("/teams");
  }

  if (!activeTeamId) {
    redirect("/teams");
  }

  return (
    <FilesPage
      userId={user.id}
      userName={user.user_metadata?.full_name || user.email || "Kullanıcı"}
      teamId={activeTeamId}
    />
  );
}
