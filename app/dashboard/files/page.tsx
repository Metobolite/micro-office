import { FilesPage } from "@/app/components/files/FilesPage";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import { createClient } from "@/app/lib/supabaseServer";
import type { TeamSearchPageProps } from "@/app/types/team";
import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: TeamSearchPageProps) {
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
      userName={user.user_metadata?.full_name || user.email || "User"}
      teamId={activeTeamId}
    />
  );
}
