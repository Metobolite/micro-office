"use client";

import { supabase } from "@/app/lib/supabase";
import {
  getLocalDateInputValue,
  localDateTimeToISOString,
} from "@/app/lib/dateTime";
import type {
  AddTaskFormProps,
  Task,
  TaskPriority,
} from "@/app/types/task";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import TaskFormFields from "./TaskFormFields";

export default function AddTaskForm({
  userId,
  onTaskAdded,
  teamId,
  sortOrder,
}: AddTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = getLocalDateInputValue();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextTitle = title.trim();
    if (!nextTitle) {
      toast.error("Title cannot be empty.");
      return;
    }

    if (dueDate && dueDate < today) {
      toast.error("Due date cannot be in the past.");
      return;
    }

    const dueDateTime = localDateTimeToISOString(dueDate, dueTime);
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        team_id: teamId,
        title: nextTitle,
        description: description.trim(),
        status: "todo",
        priority,
        sort_order: sortOrder,
        due_date: dueDateTime,
      })
      .select("id, title, description, status, priority, sort_order, due_date")
      .single();

    if (!error && data) {
      toast.success("Task created.");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setDueTime("");
      onTaskAdded(data as Task);
    } else {
      toast.error("Task could not be created.", {
        description: error?.message ?? "No task data was returned.",
      });
    }

    setIsSubmitting(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <TaskFormFields
        idPrefix="new-task"
        title={title}
        description={description}
        priority={priority}
        dueDate={dueDate}
        dueTime={dueTime}
        minimumDueDate={today}
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create task"}
        </Button>
      </DialogFooter>
    </form>
  );
}
