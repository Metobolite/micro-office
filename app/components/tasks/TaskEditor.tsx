"use client";

import { supabase } from "@/app/lib/supabase";
import type { TaskEditorProps } from "@/app/types/task";
import { useState } from "react";

export default function TaskEditor({
  task,
  onSave,
  onCancel,
}: TaskEditorProps) {
  const [editTitle, setEditTitle] = useState(task.title || "");
  const [editDescription, setEditDescription] = useState(
    task.description || "",
  );
  const [editPriority, setEditPriority] = useState(task.priority || "low");

  const [editDueDate, setEditDueDate] = useState(
    task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : "",
  );
  const [editDueTime, setEditDueTime] = useState(
    task.due_date ? new Date(task.due_date).toISOString().slice(11, 16) : "",
  );

  const handleSave = async () => {
    if (!editTitle) {
      alert("Title is required.");
      return;
    }

    let dueDateTime: string | null = null;
    if (editDueDate) {
      const fullDate = editDueTime
        ? `${editDueDate}T${editDueTime}:00`
        : editDueDate;
      dueDateTime = new Date(fullDate).toISOString();
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        due_date: dueDateTime,
      })
      .eq("id", task.id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      onSave();
    }
  };

  return (
    <div className="space-y-3 rounded border bg-card p-4 text-card-foreground shadow">
      <input
        type="text"
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded border border-input bg-background p-2 text-foreground"
      />
      <textarea
        value={editDescription}
        onChange={(e) => setEditDescription(e.target.value)}
        placeholder="Description"
        className="w-full rounded border border-input bg-background p-2 text-foreground"
      />
      <select
        value={editPriority}
        onChange={(e) =>
          setEditPriority(e.target.value as "low" | "medium" | "high")
        }
        className="w-full rounded border border-input bg-background p-2 text-foreground"
      >
        <option value="low">Low Priority</option>
        <option value="medium">Medium Priority</option>
        <option value="high">High Priority</option>
      </select>
      <input
        type="date"
        value={editDueDate}
        onChange={(e) => setEditDueDate(e.target.value)}
        className="w-full rounded border border-input bg-background p-2 text-foreground"
      />
      {editDueDate && (
        <input
          type="time"
          value={editDueTime}
          onChange={(e) => setEditDueTime(e.target.value)}
          className="w-full rounded border border-input bg-background p-2 text-foreground"
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="rounded border bg-background px-4 py-2 text-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="rounded bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </div>
  );
}
