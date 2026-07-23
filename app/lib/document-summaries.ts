import { getSummarizableDocumentExtension } from "@/app/lib/file-utils";
import type {
  SummaryDocument,
  SummaryDocumentRow,
} from "@/app/types/document-summary";

export const MAX_SUMMARY_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const SUMMARY_DOCUMENT_ACCEPT = [
  ".pdf",
  ".doc",
  ".docx",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

const allowedMimeTypesByExtension = {
  pdf: new Set([
    "application/pdf",
    "application/x-pdf",
    "application/octet-stream",
  ]),
  doc: new Set([
    "application/msword",
    "application/vnd.ms-word",
    "application/octet-stream",
  ]),
  docx: new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
  ]),
};

export function toSummaryDocument(row: SummaryDocumentRow) {
  const extension = getSummarizableDocumentExtension(row.name);

  if (!extension) return null;

  return {
    id: row.id,
    name: row.name,
    path: row.path,
    size: row.size || "0 B",
    uploadedAt: row.uploaded_at,
    extension,
  } satisfies SummaryDocument;
}

export function mapSummaryDocumentRows(rows: SummaryDocumentRow[]) {
  return rows.flatMap((row) => {
    const document = toSummaryDocument(row);
    return document ? [document] : [];
  });
}

export function validateSummaryDocument(file: File) {
  const extension = getSummarizableDocumentExtension(file.name);

  if (!extension) {
    return "Only PDF, DOC, and DOCX files are supported.";
  }

  if (file.size > MAX_SUMMARY_DOCUMENT_BYTES) {
    return "Files must be 20 MB or smaller.";
  }

  if (
    file.type &&
    !allowedMimeTypesByExtension[extension].has(file.type.toLowerCase())
  ) {
    return "The file content type does not match its extension.";
  }

  return null;
}
