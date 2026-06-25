"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AddTaskForm({
  userId,
  onTaskAdded,
  teamId,
}: {
  userId: string;
  onTaskAdded: () => void;
  teamId: string;
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
      team_id: teamId,
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
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm"
    >
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Başlık</Label>
        <Input
          className="h-11 border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-900/15"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Açıklama</Label>
        <Textarea
          className="min-h-[110px] border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-900/15"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Öncelik</Label>
        <select
          className="h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Düşük</option>
          <option value="medium">Orta</option>
          <option value="high">Yüksek</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">
            Son Tarih (isteğe bağlı)
          </Label>
          <Input
            type="date"
            className="h-11 border-slate-300 bg-slate-50 text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/15"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={today}
          />
        </div>

        {dueDate ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Saat</Label>
            <Input
              type="time"
              className="h-11 border-slate-300 bg-slate-50 text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/15"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-full bg-slate-900 text-white shadow-md transition hover:bg-slate-800"
      >
        Görev Ekle
      </Button>
    </form>
  );
}
