"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AddTaskForm({
  userId,
  onTaskAdded,
}: {
  userId: string;
  onTaskAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Başlık boş olamaz");
      return;
    }

    let dueDateTime: string | null = null;

    if (dueDate) {
      // "Z" koymuyoruz, yerel tarih ve saat formatında bırakıyoruz
      const fullDate = dueTime
        ? `${dueDate}T${dueTime}:00`
        : `${dueDate}T00:00:00`;

      dueDateTime = new Date(fullDate).toISOString();
    }

    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      title,
      description,
      priority,
      due_date: dueDateTime,
    });

    if (!error) {
      toast.success("Görev başarıyla eklendi");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setDueTime("");
      onTaskAdded();
    } else {
      toast.error("Görev eklenirken hata oluştu: " + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-black">
          Başlık
        </label>
        <input
          className="w-full p-2 border border-gray-400 rounded text-black"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-black">
          Açıklama
        </label>
        <textarea
          className="w-full p-2 border border-gray-400 rounded text-black"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-black">
          Öncelik
        </label>
        <select
          className="w-full p-2 border border-gray-400 rounded text-black"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Düşük</option>
          <option value="medium">Orta</option>
          <option value="high">Yüksek</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-black">
          Son Tarih (isteğe bağlı)
        </label>
        <input
          type="date"
          className="w-full p-2 border border-gray-400 rounded text-black"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          min={today}
        />
      </div>

      {dueDate && (
        <div>
          <label className="block text-sm font-medium mb-1 text-black">
            Saat (isteğe bağlı)
          </label>
          <input
            type="time"
            className="w-full p-2 border border-gray-400 rounded text-black"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>
      )}

      <Button type="submit">Görev Ekle</Button>
    </form>
  );
}
