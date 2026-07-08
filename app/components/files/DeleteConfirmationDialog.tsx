"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { FileItem } from "@/app/types/file";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  onConfirm: (file: FileItem) => void;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  if (!file) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dosyayı silmek istiyor musunuz?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{file.name}&quot; kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => onConfirm(file)}
          >
            Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
