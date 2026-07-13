"use client";

import { DeleteConfirmationDialog } from "@/app/components/files/DeleteConfirmationDialog";
import { supabase } from "@/app/lib/supabase";
import type { FileItem, FileRow, FilesPageProps } from "@/app/types/file";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Download,
  File,
  FileText,
  Filter,
  Grid,
  ImageIcon,
  List,
  MoreHorizontal,
  Search,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
    case "document":
      return FileText;
    case "image":
      return ImageIcon;
    default:
      return File;
  }
};

const categories = ["All", "pdf", "image", "document", "video"];

export function FilesPage({
  userId,
  userName,
  teamId,
}: FilesPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  const fetchFiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", userId)
      .eq("team_id", teamId);

    if (error) {
      console.error("File listing error:", error);
      return;
    }
    if (!data) return;

    const fileRows = data as FileRow[];

    const filesWithUrl = await Promise.all(
      fileRows.map(async (file) => {
        const { data: urlData, error: urlError } = await supabase.storage
          .from("user-files")
          .createSignedUrl(file.path, 3660);

        if (urlError) {
          console.error("Signed URL error:", urlError);
        }

        const fileType = file.type || "other";

        return {
          id: file.id,
          name: file.name,
          type: fileType,
          size: file.size || "0 B",
          modified: new Date(
            file.uploaded_at || file.created_at || Date.now(),
          ).toLocaleString("en-US"),
          owner: {
            name: userName,
            avatar: "/placeholder.svg",
          },
          category: fileType,
          url: urlData?.signedUrl || "",
          path: file.path,
        };
      }),
    );

    setFiles(filesWithUrl);
  }, [teamId, userId, userName]);

  const handleDeleteConfirmed = async (file: FileItem) => {
    const toastId = toast.loading(`Deleting "${file.name}"...`);

    const { error: deleteStorageError } = await supabase.storage
      .from("user-files")
      .remove([file.path]);

    if (deleteStorageError) {
      toast.error("Storage delete error: " + deleteStorageError.message, {
        id: toastId,
      });
      return;
    }

    const { error: deleteDbError } = await supabase
      .from("files")
      .delete()
      .eq("id", file.id)
      .eq("team_id", teamId);

    if (deleteDbError) {
      toast.error("Database delete error: " + deleteDbError.message, {
        id: toastId,
      });
      return;
    }

    toast.success(`"${file.name}" was deleted.`, { id: toastId });
    fetchFiles();
  };

  const handleDownload = async (file: FileItem) => {
    const { data, error } = await supabase.storage
      .from("user-files")
      .download(file.path);
    if (error) {
      alert("File download error: " + error.message);
      return;
    }
    const blob = data as Blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
  };

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const cleanFileName = file.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_.-]/g, "_");

    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("user-files")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("File upload error: " + uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from("files").insert({
      user_id: userId,
      team_id: teamId,
      name: cleanFileName,
      type: determineFileType(fileExt),
      size: formatFileSize(file.size),
      uploaded_at: new Date().toISOString(),
      category: determineFileType(fileExt),
      path: filePath,
    });

    if (insertError) {
      alert("Database insert error: " + insertError.message);
      return;
    }

    fetchFiles();
  };

  const determineFileType = (ext: string | undefined) => {
    if (!ext) return "other";
    const e = ext.toLowerCase();
    if (["pdf"].includes(e)) return "pdf";
    if (["jpg", "jpeg", "png", "gif", "svg"].includes(e)) return "image";
    if (["doc", "docx", "txt", "xls", "xlsx", "sql", "csv"].includes(e))
      return "document";
    if (["mp4", "avi", "mov", "mkv"].includes(e)) return "video";
    return "other";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    else if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">Files</h1>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {selectedCategory}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? (
                <List className="h-4 w-4" />
              ) : (
                <Grid className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => {
              const Icon = getFileIcon(file.type);
              return (
                <Card
                  key={file.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="h-8 w-8 text-muted-foreground" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(file.url);
                              toast.success("Link copied.");
                            }}
                          >
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setFileToDelete(file);
                              setShowDeleteDialog(true);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-medium text-sm mb-2 truncate">
                      {file.name}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{file.size}</span>
                        <Badge variant="outline" className="text-xs">
                          {file.category}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={file.owner.avatar || "/placeholder.svg"}
                          />
                          <AvatarFallback className="text-xs">
                            {file.owner.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {file.modified}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredFiles.map((file) => {
                  const Icon = getFileIcon(file.type);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50"
                      onClick={() => window.open(file.url, "_blank")}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{file.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{file.size}</span>
                            <span>{file.modified}</span>
                            <div className="flex items-center space-x-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage
                                  src={file.owner.avatar || "/placeholder.svg"}
                                />
                                <AvatarFallback className="text-xs">
                                  {file.owner.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span>{file.owner.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{file.category}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => window.open(file.url, "_blank")}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>Share</DropdownMenuItem>
                            <DropdownMenuItem>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        file={fileToDelete}
        onConfirm={(file) => {
          handleDeleteConfirmed(file);
          setShowDeleteDialog(false);
          setFileToDelete(null);
        }}
      />
    </div>
  );
}
