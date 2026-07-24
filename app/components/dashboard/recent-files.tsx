import { createClient } from "@/app/lib/supabaseServer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { File, FileText, ImageIcon } from "lucide-react";
import type { TeamScopedProps } from "@/app/types/team";

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return FileText;
    case "image":
      return ImageIcon;
    default:
      return File;
  }
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function RecentFiles({ teamId }: TeamScopedProps) {
  const supabase = await createClient();

  const { data: files, error } = await supabase
    .from("files")
    .select("id, name, type, size, uploaded_at")
    .eq("team_id", teamId)
    .order("uploaded_at", { ascending: false })
    .limit(4);

  if (error || !files) {
    return (
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-base">Recent Files</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Files could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-base">Recent Files</CardTitle>
      </CardHeader>
      <CardContent className={files.length === 0 ? "px-5 py-4" : "p-4"}>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent files.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {files.map((file) => {
              const Icon = getFileIcon(file.type);

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg bg-muted/40 p-3"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card text-muted-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.size}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {file.uploaded_at ? (
                        <time dateTime={file.uploaded_at}>
                          {formatDate(file.uploaded_at)}
                        </time>
                      ) : (
                        "Unknown date"
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
