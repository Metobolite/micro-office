"use client";

import { supabase } from "@/app/lib/supabase";
import {
  localDateTimeToISOString,
  TIME_OPTIONS,
} from "@/app/lib/dateTime";
import type { AddTaskFormProps } from "@/app/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export default function AddTaskForm({
  userId,
  onTaskAdded,
  teamId,
}: AddTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title cannot be empty.");
      return;
    }

    const dueDateTime = localDateTimeToISOString(dueDate, dueTime);

    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      title,
      description,
      priority,
      due_date: dueDateTime,
      team_id: teamId,
    });

    if (!error) {
      toast.success("Task added successfully.");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setDueTime("");
      onTaskAdded();
    } else {
      toast.error("Task could not be added: " + error.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border bg-card p-5 text-card-foreground shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
    >
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Title</Label>
        <Input
          className="h-11 border-input bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring/20"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Description
        </Label>
        <Textarea
          className="min-h-[110px] border-input bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring/20"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Priority</Label>
        <select
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Due Date (optional)
          </Label>
          <Input
            type="date"
            className="h-11 border-input bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring/20"
            value={dueDate}
            onChange={(e) => {
              const nextDueDate = e.target.value;
              setDueDate(nextDueDate);

              if (!nextDueDate) setDueTime("");
            }}
            min={today}
          />
        </div>

        {dueDate ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Time</Label>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            >
              <option value="">Select a time</option>
              {TIME_OPTIONS.map((timeOption) => (
                <option key={timeOption} value={timeOption}>
                  {timeOption}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>

      <Button type="submit" className="h-11 w-full rounded-full shadow-md">
        Add Task
      </Button>
    </form>
  );
}
