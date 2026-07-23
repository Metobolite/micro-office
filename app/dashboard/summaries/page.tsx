import { DocumentSummariesPage } from "@/app/components/document-summaries/DocumentSummariesPage";
import { mapSummaryDocumentRows } from "@/app/lib/document-summaries";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import { createClient } from "@/app/lib/supabaseServer";
import type { SummaryDocumentRow } from "@/app/types/document-summary";
import type { TeamSearchPageProps } from "@/app/types/team";
import { redirect } from "next/navigation";

export default async function DocumentSummariesRoute({
  searchParams,
}: TeamSearchPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect("/auth/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedTeamId = getTeamIdFromSearchParams(resolvedSearchParams);
  const { activeTeamId, activeTeam, isRequestedTeamIdValid } =
    await getTeamContext(supabase, user.id, requestedTeamId);

  if (requestedTeamId && !isRequestedTeamIdValid) {
    redirect("/teams");
  }

  if (!activeTeamId) {
    redirect("/teams");
  }

  const { data, error: documentsError } = await supabase
    .from("files")
    .select("id, name, size, uploaded_at, path")
    .eq("user_id", user.id)
    .eq("team_id", activeTeamId)
    .order("uploaded_at", { ascending: false });

  const initialDocuments = mapSummaryDocumentRows(
    (data ?? []) as SummaryDocumentRow[],
  );

  return (
    <DocumentSummariesPage
      key={activeTeamId}
      userId={user.id}
      teamId={activeTeamId}
      teamName={activeTeam?.name ?? null}
      initialDocuments={initialDocuments}
      initialLoadFailed={Boolean(documentsError)}
    />
  );
}
