"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Button } from "@/components/ui/button";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      title,
      description,
      priority,
    });

    if (!error) {
      setTitle("");
      setDescription("");
      setPriority("medium");
      onTaskAdded();
    } else {
      alert("Görev eklenirken hata oluştu: " + error.message);
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
          required
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

      <Button type="submit">Görev Ekle</Button>
    </form>
  );
}
