"use client";

import { MAX_SUMMARY_DOCUMENT_BYTES } from "@/app/lib/document-summaries";
import { supabase } from "@/app/lib/supabase";
import type { SummaryDocument } from "@/app/types/document-summary";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Download,
  FileWarning,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";

type PreviewStatus = "loading" | "ready" | "unsupported" | "error";

type DocumentPreviewProps = {
  selectedDocument: SummaryDocument;
  onDownload: (document: SummaryDocument) => void;
};

const PDF_PREVIEW_URL_TTL_SECONDS = 15 * 60;
const BLOCKED_PREVIEW_ELEMENTS = [
  "base",
  "button",
  "canvas",
  "embed",
  "form",
  "frame",
  "frameset",
  "iframe",
  "input",
  "link",
  "meta",
  "noscript",
  "object",
  "option",
  "script",
  "select",
  "source",
  "template",
  "textarea",
  "track",
  "video",
  "audio",
  "animate",
  "animateMotion",
  "animateTransform",
  "set",
].join(",");
const URL_ATTRIBUTES = new Set([
  "action",
  "background",
  "cite",
  "formaction",
  "href",
  "poster",
  "src",
  "srcset",
  "xlink:href",
]);
const CSS_URL_PATTERN = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
const ACTIVE_CSS_PATTERN = /(?:expression\s*\(|javascript\s*:|-moz-binding\s*:|behavior\s*:)/gi;
const DOCX_FRAME_CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data: blob:",
  "connect-src 'none'",
  "frame-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "worker-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function sanitizeCss(css: string) {
  return css
    .replace(/[<>]/g, "")
    .replace(/@import\s+[^;]+;?/gi, "")
    .replace(ACTIVE_CSS_PATTERN, "")
    .replace(CSS_URL_PATTERN, (match, _quote: string, rawUrl: string) => {
      const url = rawUrl.trim();
      return /^(?:data:|blob:)/i.test(url) ? match : 'url("")';
    });
}

function getSafeExternalLink(value: string) {
  const candidate = value.trim();

  if (
    !candidate ||
    /[\u0000-\u001f\u007f\\]/.test(candidate) ||
    !/^(?:https?:|mailto:)/i.test(candidate)
  ) {
    return null;
  }

  try {
    const url = new URL(candidate);
    return ["http:", "https:", "mailto:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function isSafeEmbeddedUrl(value: string) {
  const candidate = value.trim();
  return (
    candidate.startsWith("#") ||
    /^(?:data:(?:image|font)\/|blob:)/i.test(candidate)
  );
}

function sanitizePreviewTree(root: HTMLElement) {
  root.querySelectorAll(BLOCKED_PREVIEW_ELEMENTS).forEach((element) => {
    element.remove();
  });

  root.querySelectorAll("style").forEach((styleElement) => {
    styleElement.textContent = sanitizeCss(styleElement.textContent ?? "");
  });

  root.querySelectorAll("*").forEach((element) => {
    const tagName = element.tagName.toLowerCase();

    Array.from(element.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();

      if (
        attributeName.startsWith("on") ||
        attributeName === "srcdoc" ||
        attributeName === "http-equiv" ||
        attributeName === "download"
      ) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (attributeName === "style") {
        const safeStyle = sanitizeCss(attribute.value);
        if (safeStyle) element.setAttribute(attribute.name, safeStyle);
        else element.removeAttribute(attribute.name);
        return;
      }

      if (!URL_ATTRIBUTES.has(attributeName)) return;

      if (tagName === "a" && attributeName === "href") {
        if (attribute.value.trim().startsWith("#")) return;

        const safeLink = getSafeExternalLink(attribute.value);
        if (safeLink) element.setAttribute(attribute.name, safeLink);
        else element.removeAttribute(attribute.name);
        return;
      }

      if (isSafeEmbeddedUrl(attribute.value)) return;
      element.removeAttribute(attribute.name);
    });

    if (tagName !== "a") return;

    const href = element.getAttribute("href");
    if (!href || href.startsWith("#")) {
      element.removeAttribute("target");
      element.removeAttribute("rel");
      element.removeAttribute("referrerpolicy");
      return;
    }

    element.setAttribute("target", "_blank");
    element.setAttribute("rel", "noopener noreferrer");
    element.setAttribute("referrerpolicy", "no-referrer");
  });
}

function createDocxFrameSource(
  styleContainer: HTMLElement,
  bodyContainer: HTMLElement,
) {
  sanitizePreviewTree(styleContainer);
  sanitizePreviewTree(bodyContainer);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="${DOCX_FRAME_CSP}" />
    <meta name="referrer" content="no-referrer" />
    <style>
      html, body { margin: 0; min-height: 100%; background: #fff; color: #111827; }
      body { overflow: auto; }
    </style>
    ${styleContainer.innerHTML}
  </head>
  <body>${bodyContainer.innerHTML}</body>
</html>`;
}

async function downloadPreview(path: string, signal: AbortSignal) {
  const { data, error } = await supabase.storage
    .from("user-files")
    .download(path, {}, { signal, cache: "no-store" });

  if (error) throw error;
  return data;
}

export function DocumentPreview({
  selectedDocument,
  onDownload,
}: DocumentPreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [docxFrameSource, setDocxFrameSource] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let disposed = false;
    const abortController = new AbortController();

    setPdfUrl(null);
    setDocxFrameSource(null);
    setErrorMessage(null);

    if (selectedDocument.extension === "doc") {
      setStatus("unsupported");
      return;
    }

    setStatus("loading");

    const docxPreviewModule =
      selectedDocument.extension === "docx"
        ? import("docx-preview")
        : null;

    const loadPreview = async () => {
      try {
        if (selectedDocument.extension === "pdf") {
          const { data, error } = await supabase.storage
            .from("user-files")
            .createSignedUrl(
              selectedDocument.path,
              PDF_PREVIEW_URL_TTL_SECONDS,
            );

          if (error || !data?.signedUrl) throw error ?? new Error("The PDF preview URL could not be created.");
          if (disposed) return;

          setPdfUrl(data.signedUrl);
          setStatus("ready");
          return;
        }

        if (disposed || !docxPreviewModule) return;

        const { data: fileInfo, error: fileInfoError } = await supabase.storage
          .from("user-files")
          .info(selectedDocument.path);
        if (fileInfoError) throw fileInfoError;

        const storedSize = fileInfo.size ?? fileInfo.metadata?.size;
        if (
          typeof storedSize === "number" &&
          storedSize > MAX_SUMMARY_DOCUMENT_BYTES
        ) {
          throw new Error("This document is too large to preview in the browser.");
        }
        if (disposed) return;

        const data = await downloadPreview(
          selectedDocument.path,
          abortController.signal,
        );
        if (data.size > MAX_SUMMARY_DOCUMENT_BYTES) {
          throw new Error("This document is too large to preview in the browser.");
        }

        const [{ renderAsync }, arrayBuffer] = await Promise.all([
          docxPreviewModule,
          data.arrayBuffer(),
        ]);

        if (disposed) return;

        const bodyContainer = document.createElement("div");
        const styleContainer = document.createElement("div");

        await renderAsync(arrayBuffer, bodyContainer, styleContainer, {
          className: "document-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          useBase64URL: true,
          renderAltChunks: false,
          debug: false,
        });

        if (!disposed) {
          setDocxFrameSource(
            createDocxFrameSource(styleContainer, bodyContainer),
          );
          setStatus("ready");
        }
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
      abortController.abort();
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
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full border-0 bg-white"
        />
      ) : null}

      {selectedDocument.extension === "docx" && docxFrameSource ? (
        <iframe
          title={`${selectedDocument.name} preview`}
          srcDoc={docxFrameSource}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full border-0 bg-white"
        />
      ) : null}

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
