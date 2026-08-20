"use client";

import { supabase } from "@/app/lib/supabase";
import {
  getLocalDateInputValue,
  getLocalDateTimeParts,
  localDateTimeToISOString,
} from "@/app/lib/dateTime";
import type { Task, TaskPriority } from "@/app/types/task";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import TaskFormFields from "./TaskFormFields";

type EditTaskDialogProps = {
  task: Task | null;
  userId: string;
  teamId: string;
  onClose: () => void;
  onSaved: (task: Task) => void;
};

export default function EditTaskDialog({
  task,
  userId,
  teamId,
  onClose,
  onSaved,
}: EditTaskDialogProps) {
  const initialDueDateTime = getLocalDateTimeParts(task?.due_date);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "medium",
  );
  const [dueDate, setDueDate] = useState(initialDueDateTime.date);
  const [dueTime, setDueTime] = useState(initialDueDateTime.time);
  const [isSaving, setIsSaving] = useState(false);

  if (!task) return null;

  const today = getLocalDateInputValue();
  const originalDueDate = initialDueDateTime.date;
  const minimumDueDate =
    originalDueDate && originalDueDate < today ? originalDueDate : today;

  const saveTask = async () => {
    if (isSaving) return;

    const nextTitle = title.trim();
    if (!nextTitle) {
      toast.error("Title cannot be empty.");
      return;
    }

    if (dueDate && dueDate < today && dueDate !== originalDueDate) {
      toast.error("Due date cannot be moved to another past date.");
      return;
    }

    const dueDateTime = localDateTimeToISOString(dueDate, dueTime);
    const nextTask: Task = {
      ...task,
      title: nextTitle,
      description: description.trim(),
      priority,
      due_date: dueDateTime,
    };

    setIsSaving(true);
    const { error } = await supabase
      .from("tasks")
      .update({
        title: nextTask.title,
        description: nextTask.description,
        priority: nextTask.priority,
        due_date: nextTask.due_date,
      })
      .eq("id", task.id)
      .eq("user_id", userId)
      .eq("team_id", teamId);

    if (error) {
      toast.error("Task could not be updated.", {
        description: error.message,
      });
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onSaved(nextTask);
    toast.success("Task updated.");
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Update the task details without losing its place on the board.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void saveTask();
          }}
        >
          <TaskFormFields
            idPrefix="edit-task"
            title={title}
            description={description}
            priority={priority}
            dueDate={dueDate}
            dueTime={dueTime}
            minimumDueDate={minimumDueDate}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onPriorityChange={setPriority}
            onDueDateChange={(nextDueDate) => {
              setDueDate(nextDueDate);
              if (!nextDueDate) setDueTime("");
            }}
            onDueTimeChange={setDueTime}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
