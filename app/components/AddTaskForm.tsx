"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AddTaskForm({
  userId,
  onTaskAdded,
}: {
  userId: string;
  onTaskAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("tasks").insert([
      {
        user_id: userId,
        title,
        description,
        status: "todo",
      },
    ]);

    if (error) {
      alert("Görev eklenemedi: " + error.message);
    } else {
      setTitle("");
      setDescription("");
      onTaskAdded();
    }

    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-[#BCCCDC] rounded shadow space-y-4 max-w-md mx-auto"
    >
      <h2 className="text-xl font-bold">Yeni Görev Ekle</h2>
      <input
        type="text"
        placeholder="Başlık"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="w-full p-2 border rounded"
      />
      <textarea
        placeholder="Açıklama"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full p-2 border rounded"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-[#D2C1B6] text-black font-bold px-4 py-2 rounded hover:bg-[#e9d6ca] transform duration-300"
      >
        {loading ? "Ekleniyor..." : "Görev Ekle"}
      </button>
    </form>
  );
}
