import type { FileItem, FilePageCursor, FileRow } from "@/app/types/file";

type SignedFileUrl = {
  path?: string | null;
  signedUrl?: string | null;
};

const fileDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const FILE_PAGE_SIZE = 30;
export const FILE_UPLOAD_CONCURRENCY = 3;
// Early UX guards; Storage bucket limits and RLS remain authoritative.
export const FILE_UPLOAD_BATCH_LIMIT = 20;
export const MAX_FILE_UPLOAD_BYTES = 100 * 1024 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATABASE_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?$/;

export function getFilePageCursor(
  row?: Pick<FileRow, "id" | "uploaded_at"> | null,
): FilePageCursor | null {
  if (!row || !UUID_PATTERN.test(row.id)) return null;

  if (row.uploaded_at === null) {
    return {
      uploadedAt: null,
      id: row.id,
    };
  }

  if (typeof row.uploaded_at !== "string") return null;

  if (
    !DATABASE_TIMESTAMP_PATTERN.test(row.uploaded_at) ||
    !Number.isFinite(Date.parse(row.uploaded_at))
  ) {
    return null;
  }

  return {
    // Preserve PostgreSQL's fractional-second precision. Converting through
    // Date/toISOString truncates microseconds and can skip a keyset boundary.
    uploadedAt: row.uploaded_at,
    id: row.id,
  };
}

export function getFilePageCursorFilter(cursor: FilePageCursor) {
  const safeCursor = getFilePageCursor({
    id: cursor.id,
    uploaded_at: cursor.uploadedAt,
  });
  if (!safeCursor) return null;

  if (safeCursor.uploadedAt === null) {
    return `and(uploaded_at.is.null,id.lt.${safeCursor.id})`;
  }

  return [
    `uploaded_at.lt.${safeCursor.uploadedAt}`,
    `and(uploaded_at.eq.${safeCursor.uploadedAt},id.lt.${safeCursor.id})`,
    "uploaded_at.is.null",
  ].join(",");
}

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

export function mapFileRows(
  rows: FileRow[],
  signedUrls: SignedFileUrl[] = [],
): FileItem[] {
  const signedUrlByPath = new Map(
    signedUrls.flatMap((signedUrl) =>
      signedUrl.path && signedUrl.signedUrl
        ? [[signedUrl.path, signedUrl.signedUrl] as const]
        : [],
    ),
  );

  return rows.map((file) => ({
    id: file.id,
    name: file.name,
    type: file.type || "other",
    size: file.size || "0 B",
    modified: fileDateFormatter.format(
      new Date(file.uploaded_at || Date.now()),
    ),
    url: signedUrlByPath.get(file.path) ?? "",
    path: file.path,
  }));
}

export function sanitizeStorageFileName(fileName: string) {
  return (
    fileName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_.-]/g, "_") || "file"
  );
}

export async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<TResult>,
) {
  if (items.length === 0) return [];

  const results = new Array<TResult>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      }
    }),
  );

  return results;
}
