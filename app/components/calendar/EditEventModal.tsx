"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function EditEventModal({
  event,
  onEventUpdated,
  teamId,
}: {
  event: any;
  onEventUpdated: () => void;
  teamId: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [type, setType] = useState(event.type);
  const [date, setDate] = useState(event.date);
  const [time, setTime] = useState(event.time);
  const [duration, setDuration] = useState(event.duration);

  const handleUpdate = async () => {
    const { error } = await supabase
      .from("events")
      .update({
        title,
        description,
        type,
        date,
        time,
        duration,
      })
      .eq("id", event.id)
      .eq("team_id", teamId);

    if (error) {
      toast.error("Etkinlik güncellenemedi.");
      console.error(error);
    } else {
      toast.success("Etkinlik güncellendi!");
      onEventUpdated();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="space-y-2">
        <DialogTitle>Etkinliği Düzenle</DialogTitle>
        <div>
          <Label className="mb-2">Başlık</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label className="mb-2">Açıklama</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-2">Tür</Label>
          <select
            className="w-full p-2 border rounded"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="meeting">Toplantı</option>
            <option value="review">İnceleme</option>
            <option value="presentation">Sunum</option>
            <option value="planning">Planlama</option>
          </select>
        </div>
        <div>
          <Label className="mb-2">Tarih</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-2">Saat</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-2">Süre</Label>
          <Input
            type="text"
            placeholder="01:00"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <Button onClick={handleUpdate} className="w-full">
          Kaydet
        </Button>
      </DialogContent>
    </Dialog>
  );
}
