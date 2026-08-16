import { DocumentSummariesPage } from "@/app/components/document-summaries/DocumentSummariesPage";
import {
  DOCUMENT_PAGE_SIZE,
  mapSummaryDocumentRows,
  SUMMARY_DOCUMENT_NAME_FILTER,
} from "@/app/lib/document-summaries";
import { getFilePageCursor } from "@/app/lib/file-utils";
import { getTeamContext } from "@/app/lib/team-context";
import {
  createClient,
  getCurrentIdentity,
} from "@/app/lib/supabaseServer";
import type { SummaryDocumentRow } from "@/app/types/document-summary";
import { redirect } from "next/navigation";

export default async function DocumentSummariesRoute() {
  const { user, error: userError } = await getCurrentIdentity();

  if (!user || userError) {
    redirect("/auth/login");
  }

  const { activeTeamId } = await getTeamContext(user.id);

  if (!activeTeamId) {
    redirect("/teams");
  }

  const supabase = await createClient();
  const { data, error: documentsError } = await supabase
    .from("files")
    .select("id, name, size, uploaded_at, path")
    .eq("user_id", user.id)
    .eq("team_id", activeTeamId)
    .or(SUMMARY_DOCUMENT_NAME_FILTER)
    .order("uploaded_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(DOCUMENT_PAGE_SIZE + 1);
  const allDocumentRows = (data ?? []) as SummaryDocumentRow[];
  const documentRows = allDocumentRows.slice(0, DOCUMENT_PAGE_SIZE);
  const initialNextCursor = getFilePageCursor(documentRows.at(-1));

  const initialDocuments = mapSummaryDocumentRows(documentRows);

  return (
    <DocumentSummariesPage
      key={activeTeamId}
      userId={user.id}
      teamId={activeTeamId}
      initialDocuments={initialDocuments}
      initialHasMore={
        allDocumentRows.length > DOCUMENT_PAGE_SIZE &&
        initialNextCursor !== null
      }
      initialNextCursor={initialNextCursor}
      initialLoadFailed={Boolean(documentsError)}
    />
  );
}
