import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ImageIcon, File } from "lucide-react";

const files = [
  {
    name: "Project Proposal.pdf",
    size: "2.4 MB",
    modified: "2 saat önce",
    type: "pdf",
  },
  {
    name: "UI Mockups.fig",
    size: "15.8 MB",
    modified: "4 saat önce",
    type: "design",
  },
  {
    name: "Database Schema.sql",
    size: "156 KB",
    modified: "1 gün önce",
    type: "code",
  },
  {
    name: "Team Photo.jpg",
    size: "3.2 MB",
    modified: "2 gün önce",
    type: "image",
  },
];

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

export function RecentFiles() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Son Dosyalar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={file.name}
                className="flex items-center space-x-3 p-3 rounded-lg border"
              >
                <Icon className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.size}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.modified}
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
