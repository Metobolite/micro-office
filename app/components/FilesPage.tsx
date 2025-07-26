// components/files/FilesPage.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Upload,
  Search,
  Filter,
  FileText,
  ImageIcon,
  File,
  Download,
  MoreHorizontal,
  Grid,
  List,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/app/components/DeleteConfirmationDialog";
import { FileItem } from "@/app/types/file";

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

const categories = [
  "Tümü",
  "Dökümanlar",
  "Görseller",
  "Tasarım",
  "Video",
  "Kod",
];

export function FilesPage({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Dosya listeleme hatası:", error);
      return;
    }
    if (!data) return;

    const filesWithUrl = await Promise.all(
      data.map(async (file: any) => {
        const { data: urlData, error: urlError } = await supabase.storage
          .from("user-files")
          .createSignedUrl(file.path, 60);

        if (urlError) {
          console.error("Signed URL alma hatası:", urlError);
        }

        return {
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          modified: new Date(
            file.uploaded_at || file.created_at
          ).toLocaleString("tr-TR"),
          owner: {
            name: userName,
            avatar: "/placeholder.svg",
          },
          category: file.type || "Dökümanlar",
          url: urlData?.signedUrl || "",
          path: file.path,
        };
      })
    );

    setFiles(filesWithUrl);
  };

  const handleDeleteConfirmed = async (file: FileItem) => {
    const toastId = toast.loading(`"${file.name}" siliniyor...`);

    const { error: deleteStorageError } = await supabase.storage
      .from("user-files")
      .remove([file.path]);

    if (deleteStorageError) {
      toast.error("Storage silme hatası: " + deleteStorageError.message, {
        id: toastId,
      });
      return;
    }

    const { error: deleteDbError } = await supabase
      .from("files")
      .delete()
      .eq("id", file.id);

    if (deleteDbError) {
      toast.error("Veritabanı silme hatası: " + deleteDbError.message, {
        id: toastId,
      });
      return;
    }

    toast.success(`"${file.name}" başarıyla silindi.`, { id: toastId });
    fetchFiles();
  };

  const handleDownload = async (file: FileItem) => {
    const { data, error } = await supabase.storage
      .from("user-files")
      .download(file.path);
    if (error) {
      alert("Dosya indirme hatası: " + error.message);
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
  }, []);

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Tümü" || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("user-files")
      .upload(filePath, file);

    if (uploadError) {
      alert("Dosya yüklenirken hata oluştu: " + uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from("files").insert({
      user_id: userId,
      name: file.name,
      type: determineFileType(fileExt),
      size: formatFileSize(file.size),
      uploaded_at: new Date().toISOString(),
      category: "Dökümanlar",
      path: filePath,
    });

    if (insertError) {
      alert(
        "Veritabanına kayıt yapılırken hata oluştu: " + insertError.message
      );
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
          <h1 className="text-xl font-semibold">Dosyalar</h1>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Dosya Yükle
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
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Dosya ara..."
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
                            İndir
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(file.url);
                              toast.success("Link kopyalandı!");
                            }}
                          >
                            Linki Kopyala
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setFileToDelete(file);
                              setShowDeleteDialog(true);
                            }}
                          >
                            Sil
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
                              İndir
                            </DropdownMenuItem>
                            <DropdownMenuItem>Paylaş</DropdownMenuItem>
                            <DropdownMenuItem>Sil</DropdownMenuItem>
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
