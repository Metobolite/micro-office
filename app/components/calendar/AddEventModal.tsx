"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export default function AddEventModal({
  onEventAdded,
  teamId,
}: {
  onEventAdded: () => void;
  teamId: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("meeting");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("01:00");

  const handleSubmit = async () => {
    if (!title || !date || !time) {
      toast.error("Lütfen başlık, tarih ve saat bilgilerini doldurun.");
      return;
    }

    const { error } = await supabase.from("events").insert([
      {
        title,
        description,
        type,
        date,
        time,
        duration,
        team_id: teamId,
        attendees: JSON.stringify([
          {
            name: "John Doe",
            avatar: "/placeholder.svg",
          },
        ]),
      },
    ]);

    if (error) {
      toast.error("Etkinlik eklenemedi.");
      console.error(error);
    } else {
      toast.success("Etkinlik eklendi!");
      onEventAdded();
      setOpen(false);
      setTitle("");
      setDescription("");
      setType("meeting");
      setDate("");
      setTime("");
      setDuration("01:00");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Etkinlik Ekle</Button>
      </DialogTrigger>
      <DialogContent className="space-y-2">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Etkinlik Ekle</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>

        <div>
          <Label className="mb-2">Başlık</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
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
            required
          />
        </div>

        <div>
          <Label className="mb-2">Saat</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
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

        <Button onClick={handleSubmit} className="w-full">
          Kaydet
        </Button>
      </DialogContent>
    </Dialog>
  );
}
