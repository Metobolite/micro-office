"use client";

//şimdilik çalışmıyor

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Task } from "@/app/types/task";

type TaskEditorProps = {
  task: Task;
  onSave: () => void;
  onCancel: () => void;
};

export default function TaskEditor({
  task,
  onSave,
  onCancel,
}: TaskEditorProps) {
  const [editTitle, setEditTitle] = useState(task.title || "");
  const [editDescription, setEditDescription] = useState(
    task.description || ""
  );
  const [editPriority, setEditPriority] = useState(task.priority || "low");

  const [editDueDate, setEditDueDate] = useState(
    task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : ""
  );
  const [editDueTime, setEditDueTime] = useState(
    task.due_date ? new Date(task.due_date).toISOString().slice(11, 16) : ""
  );

  const handleSave = async () => {
    if (!editTitle) {
      alert("Başlık zorunludur");
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
      alert("Hata: " + error.message);
    } else {
      onSave();
    }
  };

  return (
    <div className="p-4 border rounded bg-white shadow space-y-3">
      <input
        type="text"
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        placeholder="Başlık"
        className="w-full p-2 border rounded"
      />
      <textarea
        value={editDescription}
        onChange={(e) => setEditDescription(e.target.value)}
        placeholder="Açıklama"
        className="w-full p-2 border rounded"
      />
      <select
        value={editPriority}
        onChange={(e) =>
          setEditPriority(e.target.value as "low" | "medium" | "high")
        }
        className="w-full p-2 border rounded"
      >
        <option value="low">Düşük Öncelik</option>
        <option value="medium">Orta Öncelik</option>
        <option value="high">Yüksek Öncelik</option>
      </select>
      <input
        type="date"
        value={editDueDate}
        onChange={(e) => setEditDueDate(e.target.value)}
        className="w-full p-2 border rounded"
      />
      {editDueDate && (
        <input
          type="time"
          value={editDueTime}
          onChange={(e) => setEditDueTime(e.target.value)}
          className="w-full p-2 border rounded"
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded border border-gray-400 text-gray-600"
        >
          İptal
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          Kaydet
        </button>
      </div>
    </div>
  );
}
