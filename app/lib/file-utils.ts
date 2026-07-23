import type { FileItem } from "@/app/types/file";

export const SUMMARIZABLE_DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
] as const;

export type SummarizableDocumentExtension =
  (typeof SUMMARIZABLE_DOCUMENT_EXTENSIONS)[number];

export function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return null;
  }

  return fileName.slice(lastDotIndex + 1).toLowerCase();
}

export function getSummarizableDocumentExtension(
  fileName: string,
): SummarizableDocumentExtension | null {
  const extension = getFileExtension(fileName);

  return SUMMARIZABLE_DOCUMENT_EXTENSIONS.includes(
    extension as SummarizableDocumentExtension,
  )
    ? (extension as SummarizableDocumentExtension)
    : null;
}

export function isSummarizableDocumentName(fileName: string) {
  return getSummarizableDocumentExtension(fileName) !== null;
}

export function determineFileType(
  extension: string | null | undefined,
): FileItem["type"] {
  if (!extension) return "other";

  const normalizedExtension = extension.toLowerCase();

  if (normalizedExtension === "pdf") return "pdf";
  if (
    ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(
      normalizedExtension,
    )
  ) {
    return "image";
  }
  if (
    [
      "doc",
      "docx",
      "txt",
      "xls",
      "xlsx",
      "sql",
      "csv",
      "ppt",
      "pptx",
    ].includes(normalizedExtension)
  ) {
    return "document";
  }
  if (["mp4", "avi", "mov", "mkv", "webm"].includes(normalizedExtension)) {
    return "video";
  }

  return "other";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function sanitizeStorageFileName(fileName: string) {
  return (
    fileName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_.-]/g, "_") || "file"
  );
}
