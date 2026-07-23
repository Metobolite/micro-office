import { DocumentSummariesPage } from "@/app/components/document-summaries/DocumentSummariesPage";
import { mapSummaryDocumentRows } from "@/app/lib/document-summaries";
import {
  getTeam,
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import {
  createClient,
  getCurrentIdentity,
} from "@/app/lib/supabaseServer";
import type { SummaryDocumentRow } from "@/app/types/document-summary";
import type { TeamSearchPageProps } from "@/app/types/team";
import { redirect } from "next/navigation";

export default async function DocumentSummariesRoute({
  searchParams,
}: TeamSearchPageProps) {
  const [{ user, error: userError }, resolvedSearchParams] = await Promise.all([
    getCurrentIdentity(),
    searchParams,
  ]);

  if (!user || userError) {
    redirect("/auth/login");
  }

  const requestedTeamId = getTeamIdFromSearchParams(resolvedSearchParams);
  const { activeTeamId, isRequestedTeamIdValid } = await getTeamContext(
    user.id,
    requestedTeamId,
  );

  if (requestedTeamId && !isRequestedTeamIdValid) {
    redirect("/teams");
  }

  if (!activeTeamId) {
    redirect("/teams");
  }

  const supabase = await createClient();
  const [activeTeam, { data, error: documentsError }] = await Promise.all([
    getTeam(activeTeamId),
    supabase
      .from("files")
      .select("id, name, size, uploaded_at, path")
      .eq("user_id", user.id)
      .eq("team_id", activeTeamId)
      .order("uploaded_at", { ascending: false }),
  ]);

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
