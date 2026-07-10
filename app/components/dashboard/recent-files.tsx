import { createClient } from "@/app/lib/supabaseServer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { File, FileText, ImageIcon } from "lucide-react";

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
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function RecentFiles({ teamId }: { teamId: string }) {
  const supabase = await createClient();

  const { data: files, error } = await supabase
    .from("files")
    .select("*")
    .eq("team_id", teamId)
    .order("uploaded_at", { ascending: false })
    .limit(4);

  if (error || !files) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Files could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Files</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {files.slice(0, 4).map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 rounded-lg border"
              >
                <Icon className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.size}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(file.uploaded_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
