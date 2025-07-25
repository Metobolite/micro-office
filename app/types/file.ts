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