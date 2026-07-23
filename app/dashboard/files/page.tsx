import { FilesPage } from "@/app/components/files/FilesPage";
import {
  getTeamContext,
  getTeamIdFromSearchParams,
} from "@/app/lib/team-context";
import { FILE_PAGE_SIZE, mapFileRows } from "@/app/lib/file-utils";
import {
  createClient,
  getCurrentIdentity,
} from "@/app/lib/supabaseServer";
import type { FileRow } from "@/app/types/file";
import type { TeamSearchPageProps } from "@/app/types/team";
import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: TeamSearchPageProps) {
  const [{ user, error }, resolvedSearchParams] = await Promise.all([
    getCurrentIdentity(),
    searchParams,
  ]);

  if (!user || error) {
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
  const { data: fileData, error: filesError } = await supabase
    .from("files")
    .select("id, name, type, size, uploaded_at, path")
    .eq("user_id", user.id)
    .eq("team_id", activeTeamId)
    .order("uploaded_at", { ascending: false })
    .range(0, FILE_PAGE_SIZE);
  const allFileRows = (fileData ?? []) as FileRow[];
  const fileRows = allFileRows.slice(0, FILE_PAGE_SIZE);
  const { data: signedUrls } = fileRows.length
    ? await supabase.storage
        .from("user-files")
        .createSignedUrls(
          fileRows.map((file) => file.path),
          3660,
        )
    : { data: [] };

  return (
    <FilesPage
      key={activeTeamId}
      userId={user.id}
      teamId={activeTeamId}
      initialFiles={mapFileRows(fileRows, signedUrls ?? [])}
      initialHasMore={allFileRows.length > FILE_PAGE_SIZE}
      initialLoadFailed={Boolean(filesError)}
    />
  );
}
