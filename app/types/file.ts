export interface FileItem {
  id: string;
  name: string;
  type: "pdf" | "image" | "document" | "video" | "other";
  size: string;
  modified: string;
  url: string;
  path: string;
}

export type FileRow = {
  id: string;
  name: string;
  type: FileItem["type"] | null;
  size: string | null;
  uploaded_at: string | null;
  path: string;
};

export type FilePageCursor = {
  uploadedAt: string | null;
  id: string;
};

export type FilesPageProps = {
  userId: string;
  teamId: string;
  initialFiles: FileItem[];
  initialHasMore?: boolean;
  initialNextCursor?: FilePageCursor | null;
  initialLoadFailed?: boolean;
};

export type DeleteConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  onConfirm: (file: FileItem) => void;
};
