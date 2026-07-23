"use client";

import { MAX_SUMMARY_DOCUMENT_BYTES } from "@/app/lib/document-summaries";
import { supabase } from "@/app/lib/supabase";
import type { SummaryDocument } from "@/app/types/document-summary";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Download,
  FileWarning,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PreviewStatus = "loading" | "ready" | "unsupported" | "error";

type DocumentPreviewProps = {
  selectedDocument: SummaryDocument;
  onDownload: (document: SummaryDocument) => void;
};

const previewDownloadRequests = new Map<string, Promise<Blob>>();

function downloadPreview(path: string) {
  const existingRequest = previewDownloadRequests.get(path);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const { data, error } = await supabase.storage
      .from("user-files")
      .download(path);

    if (error) throw error;
    return data;
  })();

  previewDownloadRequests.set(path, request);
  void request.then(
    () => {
      if (previewDownloadRequests.get(path) === request) {
        previewDownloadRequests.delete(path);
      }
    },
    () => {
      if (previewDownloadRequests.get(path) === request) {
        previewDownloadRequests.delete(path);
      }
    },
  );

  return request;
}

export function DocumentPreview({
  selectedDocument,
  onDownload,
}: DocumentPreviewProps) {
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const docxContainer = docxContainerRef.current;
    let disposed = false;
    let objectUrl: string | null = null;

    setPdfUrl(null);
    setErrorMessage(null);
    docxContainer?.replaceChildren();

    if (selectedDocument.extension === "doc") {
      setStatus("unsupported");
      return () => docxContainer?.replaceChildren();
    }

    setStatus("loading");

    const docxPreviewModule =
      selectedDocument.extension === "docx"
        ? import("docx-preview")
        : null;

    const loadPreview = async () => {
      try {
        const data = await downloadPreview(selectedDocument.path);
        if (data.size > MAX_SUMMARY_DOCUMENT_BYTES) {
          throw new Error("This document is too large to preview in the browser.");
        }

        if (selectedDocument.extension === "pdf") {
          objectUrl = URL.createObjectURL(
            new Blob([data], { type: "application/pdf" }),
          );

          if (disposed) {
            URL.revokeObjectURL(objectUrl);
            return;
          }

          setPdfUrl(objectUrl);
          setStatus("ready");
          return;
        }

        const container = docxContainerRef.current;
        if (!container || disposed || !docxPreviewModule) return;

        const [{ renderAsync }, arrayBuffer] = await Promise.all([
          docxPreviewModule,
          data.arrayBuffer(),
        ]);

        if (disposed) return;

        await renderAsync(arrayBuffer, container, container, {
          className: "document-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          useBase64URL: true,
          renderAltChunks: false,
          debug: false,
        });

        if (!disposed) setStatus("ready");
      } catch (error) {
        if (disposed) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The document preview could not be loaded.",
        );
        setStatus("error");
      }
    };

    void loadPreview();

    return () => {
      disposed = true;
      docxContainer?.replaceChildren();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reloadKey, selectedDocument.extension, selectedDocument.path]);

  return (
    <div
      className="relative h-[34rem] overflow-hidden bg-muted/30"
      aria-busy={status === "loading"}
    >
      {selectedDocument.extension === "pdf" && pdfUrl ? (
        <iframe
          title={`${selectedDocument.name} preview`}
          src={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
          className="absolute inset-0 size-full border-0 bg-white"
        />
      ) : null}

      {selectedDocument.extension === "docx" ? (
        <div
          ref={docxContainerRef}
          className={cn(
            "document-docx-preview h-full overflow-auto",
            status !== "ready" && "invisible",
          )}
        />
      ) : (
        <div ref={docxContainerRef} className="hidden" />
      )}

      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Opening document...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The file stays in your Supabase storage.
            </p>
          </div>
        </div>
      ) : null}

      {status === "unsupported" ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileWarning className="size-5" />
            </span>
            <h3 className="mt-4 font-medium">Legacy Word preview</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Older .doc files cannot be rendered safely in the browser. You can
              still download the file, and AI summaries can support it once the
              server integration is connected.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => onDownload(selectedDocument)}
            >
              <Download className="size-4" />
              Download file
            </Button>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertCircle className="size-5" />
            </span>
            <h3 className="mt-4 font-medium">Preview unavailable</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {errorMessage || "The document preview could not be loaded."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReloadKey((current) => current + 1)}
              >
                <RotateCcw className="size-4" />
                Try again
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDownload(selectedDocument)}
              >
                <Download className="size-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
