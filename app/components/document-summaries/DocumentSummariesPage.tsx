"use client";

import { DocumentPreview } from "@/app/components/document-summaries/DocumentPreview";
import {
  mapSummaryDocumentRows,
  SUMMARY_DOCUMENT_ACCEPT,
  validateSummaryDocument,
} from "@/app/lib/document-summaries";
import {
  determineFileType,
  formatFileSize,
  getFileExtension,
  sanitizeStorageFileName,
} from "@/app/lib/file-utils";
import { supabase } from "@/app/lib/supabase";
import type {
  DocumentSummariesPageProps,
  SummaryDocument,
  SummaryDocumentRow,
} from "@/app/types/document-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Download,
  FileText,
  FileType2,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function formatDocumentDate(value: string | null) {
  if (!value) return "Date unavailable";

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DocumentTypeIcon({ document }: { document: SummaryDocument }) {
  const isPdf = document.extension === "pdf";

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        isPdf
          ? "bg-red-500/10 text-red-600 dark:text-red-400"
          : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      )}
    >
      {isPdf ? (
        <FileText className="size-5" />
      ) : (
        <FileType2 className="size-5" />
      )}
    </span>
  );
}

export function DocumentSummariesPage({
  userId,
  teamId,
  teamName,
  initialDocuments,
  initialLoadFailed,
}: DocumentSummariesPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] =
    useState<SummaryDocument[]>(initialDocuments);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    initialDocuments[0]?.id ?? null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(initialLoadFailed);
  const [showAiSetupNotice, setShowAiSetupNotice] = useState(false);

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return documents.filter((document) =>
      document.name.toLowerCase().includes(query),
    );
  }, [documents, searchTerm]);

  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? null;

  const loadDocuments = useCallback(async () => {
    setIsRefreshing(true);

    const { data, error } = await supabase
      .from("files")
      .select("id, name, size, uploaded_at, path")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Document listing error:", error);
      setLoadFailed(true);
      setIsRefreshing(false);
      return null;
    }

    const nextDocuments = mapSummaryDocumentRows(
      (data ?? []) as SummaryDocumentRow[],
    );
    setDocuments(nextDocuments);
    setLoadFailed(false);
    setSelectedDocumentId((currentId) =>
      currentId && nextDocuments.some((document) => document.id === currentId)
        ? currentId
        : nextDocuments[0]?.id ?? null,
    );
    setIsRefreshing(false);
    return nextDocuments;
  }, [teamId, userId]);

  const uploadDocuments = useCallback(
    async (selectedFiles: File[]) => {
      if (selectedFiles.length === 0 || isUploading) return;

      const validFiles: File[] = [];
      const invalidFiles: Array<{ name: string; reason: string }> = [];

      selectedFiles.forEach((file) => {
        const validationError = validateSummaryDocument(file);
        if (validationError) {
          invalidFiles.push({ name: file.name, reason: validationError });
        } else {
          validFiles.push(file);
        }
      });

      if (validFiles.length === 0) {
        toast.error("No supported documents were selected.", {
          description: invalidFiles[0]
            ? `${invalidFiles[0].name}: ${invalidFiles[0].reason}`
            : undefined,
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setIsUploading(true);
      const toastId = toast.loading(
        validFiles.length === 1
          ? `Adding "${validFiles[0].name}"...`
          : `Adding ${validFiles.length} documents...`,
      );
      const uploadBatchId = Date.now();
      const failures = [...invalidFiles];
      const uploadedPaths: string[] = [];

      for (const [index, file] of validFiles.entries()) {
        const extension = getFileExtension(file.name);
        const fileType = determineFileType(extension);
        const storageName = sanitizeStorageFileName(file.name);
        const filePath = `${userId}/${uploadBatchId}_${index}_${storageName}`;

        const { error: uploadError } = await supabase.storage
          .from("user-files")
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          failures.push({ name: file.name, reason: uploadError.message });
          continue;
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
          failures.push({ name: file.name, reason: insertError.message });
          await supabase.storage.from("user-files").remove([filePath]);
          continue;
        }

        uploadedPaths.push(filePath);
      }

      const refreshedDocuments =
        uploadedPaths.length > 0 ? await loadDocuments() : null;
      const newestDocument = refreshedDocuments?.find((document) =>
        uploadedPaths.includes(document.path),
      );

      if (newestDocument) {
        setSelectedDocumentId(newestDocument.id);
        setSearchTerm("");
        setShowAiSetupNotice(false);
      }

      if (uploadedPaths.length === validFiles.length && invalidFiles.length === 0) {
        toast.success(
          uploadedPaths.length === 1
            ? `"${validFiles[0].name}" was added to Files.`
            : `${uploadedPaths.length} documents were added to Files.`,
          { id: toastId },
        );
      } else if (uploadedPaths.length > 0) {
        toast.warning(
          `${uploadedPaths.length} of ${selectedFiles.length} documents were added.`,
          {
            id: toastId,
            description: failures[0]
              ? `${failures[0].name}: ${failures[0].reason}`
              : undefined,
          },
        );
      } else {
        toast.error("The documents could not be added.", {
          id: toastId,
          description: failures[0]
            ? `${failures[0].name}: ${failures[0].reason}`
            : undefined,
        });
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploading(false);
    },
    [isUploading, loadDocuments, teamId, userId],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    void uploadDocuments(Array.from(event.target.files ?? []));
  };

  const handleDownload = useCallback(async (document: SummaryDocument) => {
    const toastId = toast.loading(`Preparing "${document.name}"...`);
    const { data, error } = await supabase.storage
      .from("user-files")
      .download(document.path);

    if (error) {
      toast.error("The document could not be downloaded.", {
        id: toastId,
        description: error.message,
      });
      return;
    }

    const objectUrl = URL.createObjectURL(data);
    const link = window.document.createElement("a");
    link.href = objectUrl;
    link.download = document.name;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    toast.success("Download started.", { id: toastId });
  }, []);

  const handleGenerateSummary = () => {
    setShowAiSetupNotice(true);
    toast.info("AI summaries are ready for the API connection.");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div>
          <h1 className="text-xl font-semibold">AI Summaries</h1>
          {teamName ? (
            <p className="text-xs text-muted-foreground">{teamName}</p>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-6">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Sparkles className="size-4" />
                </span>
                Document workspace
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Review and summarize your documents
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open PDF and Word files already in Files, or add a new one here.
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
                <Plus className="size-4" />
              )}
              {isUploading ? "Adding files..." : "Add your files"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={SUMMARY_DOCUMENT_ACCEPT}
              className="hidden"
              onChange={handleFileChange}
            />
          </section>

          {loadFailed ? (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-medium">Documents could not be loaded.</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Check your connection and try refreshing this list.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                onClick={() => void loadDocuments()}
              >
                <RefreshCw
                  className={cn("size-4", isRefreshing && "animate-spin")}
                />
                Try again
              </Button>
            </div>
          ) : null}

          {documents.length === 0 && !loadFailed ? (
            <Card className="border-dashed py-0 shadow-none">
              <CardContent className="flex min-h-80 flex-col items-center justify-center p-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Upload className="size-5" />
                </span>
                <h3 className="mt-4 font-medium">Add your first document</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  PDF, DOC, and DOCX files added here are saved to Files
                  automatically. Files can be up to 20 MB.
                </p>
                <Button
                  type="button"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="size-4" />
                  Add your files
                </Button>
              </CardContent>
            </Card>
          ) : documents.length > 0 ? (
            <div className="grid items-start gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
              <Card className="gap-0 overflow-hidden py-0 xl:sticky xl:top-0">
                <div className="flex items-center justify-between border-b p-4">
                  <div>
                    <h3 className="font-medium">Documents</h3>
                    <p className="text-xs text-muted-foreground">
                      {documents.length} {documents.length === 1 ? "file" : "files"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={isRefreshing}
                    onClick={() => void loadDocuments()}
                    aria-label="Refresh documents"
                    title="Refresh documents"
                  >
                    <RefreshCw
                      className={cn("size-4", isRefreshing && "animate-spin")}
                    />
                  </Button>
                </div>

                <div className="border-b p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search documents..."
                      aria-label="Search documents"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="max-h-[32rem] space-y-1 overflow-y-auto p-2">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((document) => {
                      const isSelected = document.id === selectedDocumentId;

                      return (
                        <button
                          key={document.id}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border border-transparent p-2.5 text-left transition-colors hover:bg-muted/60",
                            isSelected && "border-border bg-muted",
                          )}
                          onClick={() => {
                            setSelectedDocumentId(document.id);
                            setShowAiSetupNotice(false);
                          }}
                        >
                          <DocumentTypeIcon document={document} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {document.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {document.size} · {formatDocumentDate(document.uploadedAt)}
                            </span>
                          </span>
                          <Badge variant="outline" className="font-normal uppercase">
                            {document.extension}
                          </Badge>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-10 text-center">
                      <Search className="mx-auto size-5 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium">No documents found</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try a different file name.
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {selectedDocument ? (
                <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
                  <Card className="min-w-0 gap-0 overflow-hidden py-0">
                    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <DocumentTypeIcon document={selectedDocument} />
                        <div className="min-w-0">
                          <h3 className="truncate font-medium" title={selectedDocument.name}>
                            {selectedDocument.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {selectedDocument.size} · {selectedDocument.extension.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleDownload(selectedDocument)}
                      >
                        <Download className="size-4" />
                        Download
                      </Button>
                    </div>
                    <DocumentPreview
                      key={selectedDocument.id}
                      selectedDocument={selectedDocument}
                      onDownload={(document) => void handleDownload(document)}
                    />
                  </Card>

                  <Card className="gap-0 overflow-hidden py-0">
                    <div className="border-b p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
                            <h3 className="font-medium">AI summary</h3>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            A concise overview with key points and actions.
                          </p>
                        </div>
                        <Badge variant="outline" className="font-normal">
                          Setup pending
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <LockKeyhole className="size-5" />
                      </span>
                      <h3 className="mt-4 font-medium">
                        {showAiSetupNotice
                          ? "OpenAI connection required"
                          : "Ready for AI summaries"}
                      </h3>
                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        {showAiSetupNotice
                          ? "The document workspace is complete. Add the server API key later to enable summary generation."
                          : "The AI action is prepared but does not send this document anywhere while no API key is configured."}
                      </p>
                      <Button
                        type="button"
                        className="mt-5"
                        onClick={handleGenerateSummary}
                      >
                        <Sparkles className="size-4" />
                        Generate summary
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
