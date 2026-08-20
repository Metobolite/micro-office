"use client";

import { supabase } from "@/app/lib/supabase";
import type { Task } from "@/app/types/task";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { toast } from "sonner";

type DeleteTaskDialogProps = {
  task: Task | null;
  userId: string;
  teamId: string;
  onClose: () => void;
  onDeleted: (taskId: string) => void;
};

export default function DeleteTaskDialog({
  task,
  userId,
  teamId,
  onClose,
  onDeleted,
}: DeleteTaskDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!task) return null;

  const deleteTask = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", userId)
      .eq("team_id", teamId);

    if (error) {
      toast.error("Task could not be deleted.", {
        description: error.message,
      });
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
    onDeleted(task.id);
    toast.success("Task deleted.");
    onClose();
  };

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this task?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{task.title}&quot; will be permanently deleted. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              void deleteTask();
            }}
          >
            {isDeleting ? "Deleting..." : "Delete task"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
