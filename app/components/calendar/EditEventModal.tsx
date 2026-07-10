"use client";

import { supabase } from "@/app/lib/supabase";
import type { EventType } from "@/app/types/EventType";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export default function EditEventModal({
  event,
  onEventUpdated,
  teamId,
  userId,
}: {
  event: EventType;
  onEventUpdated: () => void;
  teamId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [type, setType] = useState(event.type);
  const [date, setDate] = useState(event.date);
  const [time, setTime] = useState(event.time ?? "");
  const [duration, setDuration] = useState(event.duration ?? "");

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
      .eq("team_id", teamId)
      .eq("user_id", userId);

    if (error) {
      toast.error("Event could not be updated.");
      console.error(error);
    } else {
      toast.success("Event updated.");
      onEventUpdated();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="space-y-2">
        <DialogTitle>Edit Event</DialogTitle>
        <div>
          <Label className="mb-2">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label className="mb-2">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-2">Type</Label>
          <select
            className="w-full p-2 border rounded"
            value={type}
            onChange={(e) => setType(e.target.value as EventType["type"])}
          >
            <option value="meeting">Meeting</option>
            <option value="review">Review</option>
            <option value="presentation">Presentation</option>
            <option value="planning">Planning</option>
          </select>
        </div>
        <div>
          <Label className="mb-2">Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-2">Time</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-2">Duration</Label>
          <Input
            type="text"
            placeholder="01:00"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <Button onClick={handleUpdate} className="w-full">
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
