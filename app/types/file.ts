export interface FileItem {
  id: string;
  name: string;
  type: "pdf" | "image" | "document" | "video" | "other";
  size: string;
  modified: string;
  owner: {
    name: string;
    avatar: string;
  };
  category: string;
  url: string;
  path: string;
}

export type FileRow = {
  id: string;
  name: string;
  type: FileItem["type"] | null;
  size: string | null;
  uploaded_at: string | null;
  created_at: string | null;
  path: string;
};

export type FilesPageProps = {
  userId: string;
  userName: string;
  teamId: string;
  teamName: string | null;
};

export type DeleteConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  onConfirm: (file: FileItem) => void;
};
