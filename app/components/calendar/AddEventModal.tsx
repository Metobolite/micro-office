"use client";

import { supabase } from "@/app/lib/supabase";
import type { AddEventModalProps } from "@/app/types/EventType";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useState } from "react";
import { toast } from "sonner";

const TIME_STEP_MINUTES = 30;
const MAX_DURATION_HOURS = 10;

const formatTimeValue = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const formatDurationLabel = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = `${hours} ${hours === 1 ? "hour" : "hours"}`;

  if (hours === 0) return `${minutes} minutes`;
  if (minutes === 0) return hourLabel;

  return `${hourLabel} ${minutes} minutes`;
};

const timeOptions = Array.from(
  { length: (24 * 60) / TIME_STEP_MINUTES },
  (_, index) => formatTimeValue(index * TIME_STEP_MINUTES),
);

const durationOptions = Array.from(
  { length: (MAX_DURATION_HOURS * 60) / TIME_STEP_MINUTES },
  (_, index) => {
    const totalMinutes = (index + 1) * TIME_STEP_MINUTES;

    return {
      label: formatDurationLabel(totalMinutes),
      value: formatTimeValue(totalMinutes),
    };
  },
);

export default function AddEventModal({
  userId,
  onEventAdded,
  teamId,
}: AddEventModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("meeting");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("01:00");

  const handleSubmit = async () => {
    if (!title || !date || !time) {
      toast.error("Please fill in the title, date, and time.");
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
        user_id: userId,
        attendees: JSON.stringify([
          {
            name: "John Doe",
            avatar: "/placeholder.svg",
          },
        ]),
      },
    ]);

    if (error) {
      toast.error("Event could not be added.");
      console.error(error);
    } else {
      toast.success("Event added.");
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
        <Button>+ Add Event</Button>
      </DialogTrigger>
      <DialogContent className="space-y-2">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Add Event</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>

        <div>
          <Label className="mb-2">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
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
            className="w-full p-2 border rounded bg-accent text-accent-foreground"
            value={type}
            onChange={(e) => setType(e.target.value)}
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
            required
          />
        </div>

        <div>
          <Label className="mb-2">Time</Label>
          <select
            className="w-full p-2 border rounded bg-accent text-accent-foreground"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          >
            <option value="" disabled>
              Select a time
            </option>
            {timeOptions.map((timeOption) => (
              <option key={timeOption} value={timeOption}>
                {timeOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="mb-2">Duration</Label>
          <select
            className="w-full p-2 border rounded bg-accent text-accent-foreground"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            {durationOptions.map((durationOption) => (
              <option key={durationOption.value} value={durationOption.value}>
                {durationOption.label}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleSubmit} className="w-full">
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
