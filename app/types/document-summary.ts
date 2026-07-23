import type { FileRow } from "@/app/types/file";
import type { SummarizableDocumentExtension } from "@/app/lib/file-utils";

export type SummaryDocumentRow = Pick<
  FileRow,
  "id" | "name" | "size" | "uploaded_at" | "path"
>;

export type SummaryDocument = {
  id: string;
  name: string;
  path: string;
  size: string;
  uploadedAt: string | null;
  extension: SummarizableDocumentExtension;
};

export type DocumentSummariesPageProps = {
  userId: string;
  teamId: string;
  teamName: string | null;
  initialDocuments: SummaryDocument[];
  initialLoadFailed: boolean;
};
