"use client";

import { DeleteConfirmationDialog } from "@/app/components/files/DeleteConfirmationDialog";
import {
  determineFileType,
  FILE_PAGE_SIZE,
  FILE_UPLOAD_BATCH_LIMIT,
  FILE_UPLOAD_CONCURRENCY,
  formatFileSize,
  getFileExtension,
  getFilePageCursor,
  getFilePageCursorFilter,
  mapWithConcurrency,
  mapFileRows,
  MAX_FILE_UPLOAD_BYTES,
  sanitizeStorageFileName,
} from "@/app/lib/file-utils";
import { supabase } from "@/app/lib/supabase";
import type {
  FileItem,
  FilePageCursor,
  FileRow,
  FilesPageProps,
} from "@/app/types/file";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Copy,
  Download,
  File,
  FileText,
  Filter,
  FolderOpen,
  Grid2X2,
  ImageIcon,
  List,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type FileCategoryFilter = "all" | FileItem["type"];

type FileListFilters = {
  category: FileCategoryFilter;
  search: string;
};

const FILE_PREVIEW_URL_TTL_SECONDS = 15 * 60;
const FILE_ACTION_URL_TTL_SECONDS = 5 * 60;
const FILE_SEARCH_DEBOUNCE_MS = 300;

const categoryOptions: Array<{
  value: FileCategoryFilter;
  label: string;
}> = [
  { value: "all", label: "All types" },
  { value: "pdf", label: "PDFs" },
  { value: "image", label: "Images" },
  { value: "document", label: "Documents" },
  { value: "video", label: "Videos" },
  { value: "other", label: "Other" },
];

const fileTypeLabels: Record<FileItem["type"], string> = {
  pdf: "PDF",
  image: "Image",
  document: "Document",
  video: "Video",
  other: "File",
};

const fileTypeStyles: Record<FileItem["type"], string> = {
  pdf: "bg-red-500/10 text-red-600 dark:text-red-400",
  image: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  document: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  video: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  other: "bg-muted text-muted-foreground",
};

function getFileIcon(type: FileItem["type"]) {
  switch (type) {
    case "pdf":
    case "document":
      return FileText;
    case "image":
      return ImageIcon;
    default:
      return File;
  }
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function signImagePreviews(files: FileItem[]) {
  const imagePaths = Array.from(
    new Set(
      files.flatMap((file) =>
        file.type === "image" ? [file.path] : [],
      ),
    ),
  );

  if (imagePaths.length === 0) return files;

  const { data, error } = await supabase.storage
    .from("user-files")
    .createSignedUrls(imagePaths, FILE_PREVIEW_URL_TTL_SECONDS);

  if (error) {
    console.error("Image preview URL error:", error);
    return files;
  }

  const previewUrlByPath = new Map(
    (data ?? []).flatMap((signedUrl) =>
      signedUrl.path && signedUrl.signedUrl
        ? [[signedUrl.path, signedUrl.signedUrl] as const]
        : [],
    ),
  );

  return files.map((file) => ({
    ...file,
    url: previewUrlByPath.get(file.path) ?? file.url,
  }));
}

function mergePreviewUrls(currentFiles: FileItem[], previewFiles: FileItem[]) {
  const previewUrlByPath = new Map(
    previewFiles.flatMap((file) =>
      file.url ? [[file.path, file.url] as const] : [],
    ),
  );

  return currentFiles.map((file) => {
    const previewUrl = previewUrlByPath.get(file.path);
    return previewUrl && previewUrl !== file.url
      ? { ...file, url: previewUrl }
      : file;
  });
}

type FileActionsProps = {
  file: FileItem;
  onCopyLink: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
};

function FileActions({
  file,
  onCopyLink,
  onDelete,
  onDownload,
}: FileActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={`Actions for ${file.name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onDownload(file)}>
          <Download className="size-4" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCopyLink(file)}>
          <Copy className="size-4" />
          Copy temporary link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(file)}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FileGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="gap-0 overflow-hidden py-0">
          <Skeleton className="h-32 rounded-none" />
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-4 w-4/5" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FilesPage({
  userId,
  teamId,
  initialFiles,
  initialHasMore = false,
  initialNextCursor = null,
  initialLoadFailed = false,
}: FilesPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const previewRefreshPathsRef = useRef(new Set<string>());
  const activeListAbortControllerRef = useRef<AbortController | null>(null);
  const listRequestIdRef = useRef(0);
  const didInitializeFiltersRef = useRef(false);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<FileCategoryFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] =
    useState<FilePageCursor | null>(initialNextCursor);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(
    initialLoadFailed
      ? "Your files could not be loaded. Please try again."
      : null,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  const fetchFilePage = useCallback(
    async (
      cursor: FilePageCursor | null,
      filters: FileListFilters,
      signal: AbortSignal,
    ) => {
      let query = supabase
        .from("files")
        .select("id, name, type, size, uploaded_at, path")
        .eq("user_id", userId)
        .eq("team_id", teamId);
      const cursorFilter = cursor
        ? getFilePageCursorFilter(cursor)
        : null;

      if (cursor && !cursorFilter) {
        return {
          error: new Error("The file page cursor is invalid."),
          files: [] as FileItem[],
          hasMore: false,
          nextCursor: null,
        };
      }

      const normalizedSearch = filters.search.trim().slice(0, 100);
      if (normalizedSearch) {
        query = query.ilike(
          "name",
          `%${escapeLikePattern(normalizedSearch)}%`,
        );
      }

      if (filters.category === "other") {
        const typeFilter = "type.eq.other,type.is.null";
        query = cursorFilter
          ? query.or(
              `and(or(${typeFilter}),or(${cursorFilter}))`,
            )
          : query.or(typeFilter);
      } else if (filters.category !== "all") {
        query = query.eq("type", filters.category);
      }

      if (cursorFilter && filters.category !== "other") {
        query = query.or(cursorFilter);
      }

      const { data, error } = await query
        .order("uploaded_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(FILE_PAGE_SIZE + 1)
        .abortSignal(signal);

      if (error) {
        return {
          error,
          files: [] as FileItem[],
          hasMore: false,
          nextCursor: null,
        };
      }

      const allFileRows = (data ?? []) as FileRow[];
      const fileRows = allFileRows.slice(0, FILE_PAGE_SIZE);
      const pageFiles = await signImagePreviews(mapFileRows(fileRows));
      const pageNextCursor = getFilePageCursor(fileRows.at(-1));

      return {
        error: null,
        files: pageFiles,
        hasMore:
          allFileRows.length > FILE_PAGE_SIZE && pageNextCursor !== null,
        nextCursor: pageNextCursor,
      };
    },
    [teamId, userId],
  );

  const fetchFiles = useCallback(
    async (showLoader = true) => {
      activeListAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      activeListAbortControllerRef.current = abortController;
      const requestId = listRequestIdRef.current + 1;
      listRequestIdRef.current = requestId;

      setIsLoading(showLoader);
      setIsLoadingMore(false);
      setLoadError(null);

      const result = await fetchFilePage(
        null,
        { category: selectedCategory, search: debouncedSearchTerm },
        abortController.signal,
      );

      if (
        abortController.signal.aborted ||
        requestId !== listRequestIdRef.current
      ) {
        return null;
      }

      if (result.error) {
        console.error("File listing error:", result.error);
        setLoadError("Your files could not be loaded. Please try again.");
      } else {
        setFiles(result.files);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
      }

      setIsLoading(false);
      if (activeListAbortControllerRef.current === abortController) {
        activeListAbortControllerRef.current = null;
      }
      return result;
    },
    [debouncedSearchTerm, fetchFilePage, selectedCategory],
  );

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;

    activeListAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    activeListAbortControllerRef.current = abortController;
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    setIsLoadingMore(true);
    const result = await fetchFilePage(
      nextCursor,
      { category: selectedCategory, search: debouncedSearchTerm },
      abortController.signal,
    );

    if (
      abortController.signal.aborted ||
      requestId !== listRequestIdRef.current
    ) {
      return;
    }

    if (result.error) {
      console.error("Additional files could not be loaded:", result.error);
      toast.error("More files could not be loaded.");
    } else {
      setFiles((currentFiles) => {
        const filesById = new Map(
          [...currentFiles, ...result.files].map((file) => [file.id, file]),
        );
        return Array.from(filesById.values());
      });
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    }

    setIsLoadingMore(false);
    if (activeListAbortControllerRef.current === abortController) {
      activeListAbortControllerRef.current = null;
    }
  }, [
    debouncedSearchTerm,
    fetchFilePage,
    hasMore,
    isLoadingMore,
    nextCursor,
    selectedCategory,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, FILE_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!didInitializeFiltersRef.current) {
      didInitializeFiltersRef.current = true;
      return;
    }

    void fetchFiles();
  }, [debouncedSearchTerm, fetchFiles, selectedCategory]);

  useEffect(() => {
    let disposed = false;

    void signImagePreviews(initialFiles).then((previewFiles) => {
      if (!disposed) {
        setFiles((currentFiles) =>
          mergePreviewUrls(currentFiles, previewFiles),
        );
      }
    });

    return () => {
      disposed = true;
    };
  }, [initialFiles]);

  useEffect(
    () => () => {
      activeListAbortControllerRef.current?.abort();
    },
    [],
  );

  const filteredFiles = files;

  const hasActiveFilters =
    searchTerm.trim().length > 0 || selectedCategory !== "all";
  const selectedCategoryLabel =
    categoryOptions.find((category) => category.value === selectedCategory)
      ?.label ?? "All types";

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedCategory("all");
  };

  const uploadFiles = useCallback(
    async (selectedFiles: File[]) => {
      if (selectedFiles.length === 0 || isUploading) return;

      if (selectedFiles.length > FILE_UPLOAD_BATCH_LIMIT) {
        toast.error(
          `Upload up to ${FILE_UPLOAD_BATCH_LIMIT} files at a time.`,
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const oversizedFailures = selectedFiles.flatMap((file) =>
        file.size > MAX_FILE_UPLOAD_BYTES
          ? [`${file.name}: Files must be 100 MB or smaller.`]
          : [],
      );
      const uploadableFiles = selectedFiles.filter(
        (file) => file.size <= MAX_FILE_UPLOAD_BYTES,
      );

      if (uploadableFiles.length === 0) {
        toast.error("Files could not be uploaded.", {
          description: oversizedFailures[0],
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setIsUploading(true);
      const toastId = toast.loading(
        uploadableFiles.length === 1
          ? `Uploading "${uploadableFiles[0].name}"...`
          : `Uploading ${uploadableFiles.length} files...`,
      );
      const uploadResults = await mapWithConcurrency(
        uploadableFiles,
        FILE_UPLOAD_CONCURRENCY,
        async (file) => {
          const cleanFileName = sanitizeStorageFileName(file.name);
          const extension = getFileExtension(file.name);
          const fileType = determineFileType(extension);
          const filePath = `${userId}/${crypto.randomUUID()}_${cleanFileName}`;

          const { error: uploadError } = await supabase.storage
            .from("user-files")
            .upload(filePath, file, { upsert: false });

          if (uploadError) {
            return {
              error: `${file.name}: ${uploadError.message}`,
              success: false,
            };
          }

          const { error: insertError } = await supabase.from("files").insert({
            user_id: userId,
            team_id: teamId,
            name: file.name,
            type: fileType,
            size: formatFileSize(file.size),
            uploaded_at: new Date().toISOString(),
            category: fileType,
            path: filePath,
          });

          if (insertError) {
            await supabase.storage.from("user-files").remove([filePath]);
            return {
              error: `${file.name}: ${insertError.message}`,
              success: false,
            };
          }

          return { error: null, success: true };
        },
      );
      const failures = [
        ...oversizedFailures,
        ...uploadResults.flatMap((result) =>
          result.error ? [result.error] : [],
        ),
      ];
      const uploadedCount = uploadResults.filter(
        (result) => result.success,
      ).length;

      if (uploadedCount === selectedFiles.length) {
        toast.success(
          uploadedCount === 1
            ? `"${selectedFiles[0].name}" was uploaded.`
            : `${uploadedCount} files were uploaded.`,
          { id: toastId },
        );
      } else if (uploadedCount > 0) {
        toast.warning(
          `${uploadedCount} of ${selectedFiles.length} files were uploaded.`,
          { id: toastId, description: failures[0] },
        );
      } else {
        toast.error("Files could not be uploaded.", {
          id: toastId,
          description: failures[0],
        });
      }

      if (uploadedCount > 0) await fetchFiles(false);

      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploading(false);
    },
    [fetchFiles, isUploading, teamId, userId],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    void uploadFiles(Array.from(event.target.files ?? []));
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.dataTransfer.types.includes("Files")) return;

    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  };

  const handleDeleteConfirmed = async (file: FileItem) => {
    const toastId = toast.loading(`Deleting "${file.name}"...`);

    const { error: deleteDbError } = await supabase
      .from("files")
      .delete()
      .eq("id", file.id)
      .eq("user_id", userId)
      .eq("team_id", teamId);

    if (deleteDbError) {
      toast.error("The file record could not be deleted.", {
        id: toastId,
        description: deleteDbError.message,
      });
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.filter((currentFile) => currentFile.id !== file.id),
    );

    const { error: deleteStorageError } = await supabase.storage
      .from("user-files")
      .remove([file.path]);

    if (deleteStorageError) {
      console.error("Orphaned file cleanup error:", deleteStorageError);
      toast.warning(`"${file.name}" was removed from the file list.`, {
        id: toastId,
        description: "Storage cleanup could not be completed.",
      });
      return;
    }

    toast.success(`"${file.name}" was deleted.`, { id: toastId });
  };

  const handleDownload = async (file: FileItem) => {
    const toastId = toast.loading(`Preparing "${file.name}"...`);
    const { data, error } = await supabase.storage
      .from("user-files")
      .createSignedUrl(file.path, FILE_ACTION_URL_TTL_SECONDS, {
        download: file.name,
      });

    if (error || !data?.signedUrl) {
      toast.error("The file could not be downloaded.", {
        id: toastId,
        description: error?.message,
      });
      return;
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = file.name;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("Download started.", { id: toastId });
  };

  const handleCopyLink = async (file: FileItem) => {
    const { data, error } = await supabase.storage
      .from("user-files")
      .createSignedUrl(file.path, FILE_ACTION_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      toast.error("A temporary link could not be created.", {
        description: error?.message,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(data.signedUrl);
      toast.success("Temporary link copied.");
    } catch {
      toast.error("The link could not be copied.");
    }
  };

  const handleOpenFile = async (file: FileItem) => {
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) {
      toast.error("Allow pop-ups to open this file.");
      return;
    }

    previewWindow.opener = null;
    const { data, error } = await supabase.storage
      .from("user-files")
      .createSignedUrl(file.path, FILE_ACTION_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      previewWindow.close();
      toast.error("The file could not be opened.", {
        description: error?.message,
      });
      return;
    }

    previewWindow.location.replace(data.signedUrl);
  };

  const refreshImagePreview = useCallback(async (file: FileItem) => {
    if (previewRefreshPathsRef.current.has(file.path)) return;

    previewRefreshPathsRef.current.add(file.path);
    const { data, error } = await supabase.storage
      .from("user-files")
      .createSignedUrl(file.path, FILE_PREVIEW_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      console.error("Image preview refresh error:", error);
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.map((currentFile) =>
        currentFile.id === file.id
          ? { ...currentFile, url: data.signedUrl }
          : currentFile,
      ),
    );
  }, []);

  const requestDelete = (file: FileItem) => {
    setFileToDelete(file);
    setShowDeleteDialog(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="relative min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging ? (
          <div className="pointer-events-none absolute inset-4 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-background/95 backdrop-blur-sm sm:inset-6">
            <div className="text-center">
              <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Upload className="size-5" />
              </span>
              <p className="font-medium">Drop files to upload</p>
              <p className="mt-1 text-sm text-muted-foreground">
                They will be added to your current team.
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-6">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/5 text-foreground">
                  <FolderOpen className="size-4" />
                </span>
                Your files
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Keep important files within reach
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload from your device or drag files anywhere onto this page.
              </p>
            </div>

            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isUploading ? "Uploading..." : "Upload files"}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={handleFileChange}
            />
          </section>

          {loadError ? (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-medium">Files could not be loaded.</p>
                  <p className="mt-0.5 text-muted-foreground">{loadError}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void fetchFiles()}
              >
                Try again
              </Button>
            </div>
          ) : null}

          <section
            aria-label="File filters"
            className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm lg:flex-row lg:items-center"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                maxLength={100}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search files"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1 sm:flex-none">
                    <Filter className="size-4" />
                    {selectedCategoryLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>File type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={selectedCategory}
                    onValueChange={(value) =>
                      setSelectedCategory(value as FileCategoryFilter)
                    }
                  >
                    {categoryOptions.map((category) => (
                      <DropdownMenuRadioItem
                        key={category.value}
                        value={category.value}
                      >
                        {category.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
                  aria-label="Clear file filters"
                  title="Clear filters"
                >
                  <X className="size-4" />
                </Button>
              ) : null}

              <div
                className="flex items-center rounded-lg border bg-muted/30 p-0.5"
                role="group"
                aria-label="File view"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-8",
                    viewMode === "grid" && "bg-background shadow-xs",
                  )}
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  title="Grid view"
                >
                  <Grid2X2 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-8",
                    viewMode === "list" && "bg-background shadow-xs",
                  )}
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  title="List view"
                >
                  <List className="size-4" />
                </Button>
              </div>

              <span
                className="ml-auto whitespace-nowrap text-xs text-muted-foreground lg:ml-1"
                aria-live="polite"
              >
                {filteredFiles.length}
                {hasMore && !hasActiveFilters ? "+" : ""}{" "}
                {filteredFiles.length === 1 ? "file" : "files"}
              </span>
            </div>
          </section>

          {isLoading ? (
            <FileGridSkeleton />
          ) : filteredFiles.length === 0 ? (
            <Card className="border-dashed py-0 shadow-none">
              <CardContent className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
                <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  {hasActiveFilters ? (
                    <Search className="size-5" />
                  ) : (
                    <FolderOpen className="size-5" />
                  )}
                </span>
                <h3 className="font-medium">
                  {hasActiveFilters ? "No matching files" : "No files yet"}
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Try a different search or clear the active filters."
                    : "Upload the first file for this team. You can also drag and drop it here."}
                </p>
                <Button
                  type="button"
                  variant={hasActiveFilters ? "outline" : "default"}
                  className="mt-4"
                  onClick={
                    hasActiveFilters
                      ? clearFilters
                      : () => fileInputRef.current?.click()
                  }
                >
                  {hasActiveFilters ? (
                    <X className="size-4" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {hasActiveFilters ? "Clear filters" : "Upload a file"}
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFiles.map((file) => {
                const Icon = getFileIcon(file.type);
                const hasImagePreview = file.type === "image" && file.url;

                return (
                  <Card
                    key={file.id}
                    className="group gap-0 overflow-hidden py-0 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <button
                      type="button"
                      className="relative flex h-32 w-full items-center justify-center overflow-hidden bg-muted/40 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      onClick={() => void handleOpenFile(file)}
                      aria-label={`Open ${file.name}`}
                    >
                      {hasImagePreview ? (
                        // The URL expires quickly, so it should not enter Next's
                        // persistent image optimizer cache.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={() => void refreshImagePreview(file)}
                          onLoad={() =>
                            previewRefreshPathsRef.current.delete(file.path)
                          }
                          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span
                          className={cn(
                            "flex size-14 items-center justify-center rounded-2xl",
                            fileTypeStyles[file.type],
                          )}
                        >
                          <Icon className="size-7" />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>

                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left outline-none focus-visible:underline"
                          onClick={() => void handleOpenFile(file)}
                        >
                          <h3 className="truncate text-sm font-medium" title={file.name}>
                            {file.name}
                          </h3>
                        </button>
                        <FileActions
                          file={file}
                          onCopyLink={handleCopyLink}
                          onDelete={requestDelete}
                          onDownload={(selectedFile) => void handleDownload(selectedFile)}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="min-w-0 truncate">
                          {file.size} · {file.modified}
                        </span>
                        <Badge variant="outline" className="shrink-0 font-normal">
                          {fileTypeLabels[file.type]}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <CardContent className="divide-y p-0">
                {filteredFiles.map((file) => {
                  const Icon = getFileIcon(file.type);

                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40 sm:p-4"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:underline"
                        onClick={() => void handleOpenFile(file)}
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            fileTypeStyles[file.type],
                          )}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {file.name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {file.size} · {file.modified}
                          </span>
                        </span>
                      </button>

                      <Badge
                        variant="outline"
                        className="hidden shrink-0 font-normal sm:inline-flex"
                      >
                        {fileTypeLabels[file.type]}
                      </Badge>
                      <FileActions
                        file={file}
                        onCopyLink={handleCopyLink}
                        onDelete={requestDelete}
                        onDownload={(selectedFile) => void handleDownload(selectedFile)}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {!isLoading && hasMore ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={isLoadingMore}
                onClick={() => void handleLoadMore()}
              >
                {isLoadingMore ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {isLoadingMore ? "Loading..." : "Load more files"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setFileToDelete(null);
        }}
        file={fileToDelete}
        onConfirm={(file) => {
          void handleDeleteConfirmed(file);
          setShowDeleteDialog(false);
          setFileToDelete(null);
        }}
      />
    </div>
  );
}
