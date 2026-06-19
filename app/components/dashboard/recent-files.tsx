import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ImageIcon, File } from "lucide-react";
import { createClient } from "@/app/lib/supabaseServer";

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
  return date.toLocaleString("tr-TR", {
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
          <CardTitle>Son Görevler</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Görevler yüklenemedi.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Son Dosyalar</CardTitle>
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
