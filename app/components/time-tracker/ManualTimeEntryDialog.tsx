"use client";

import {
  formatTimeValue,
  getLocalDateTimeParts,
  TIME_OPTIONS,
  TIME_STEP_MINUTES,
} from "@/app/lib/dateTime";
import type { ManualTimeEntryDialogProps } from "@/app/types/time-tracker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

const getInitialDateTime = () => {
  const now = new Date();
  const suggestedStart = new Date(Date.now() - 60 * 60 * 1000);
  const { date } = getLocalDateTimeParts(suggestedStart.toISOString());
  const { date: maxDate } = getLocalDateTimeParts(now.toISOString());
  const totalMinutes =
    suggestedStart.getHours() * 60 + suggestedStart.getMinutes();
  const roundedMinutes =
    Math.floor(totalMinutes / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;

  return {
    date,
    maxDate,
    time: formatTimeValue(roundedMinutes),
  };
};

export function ManualTimeEntryDialog({
  open,
  onOpenChange,
  tasks,
  isSaving,
  onSubmit,
}: ManualTimeEntryDialogProps) {
  const initialDateTime = getInitialDateTime();
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(initialDateTime.date);
  const [startTime, setStartTime] = useState(initialDateTime.time);
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const durationSeconds =
      Math.max(0, Number(hours) || 0) * 3600 +
      Math.max(0, Number(minutes) || 0) * 60;

    if (!date || !startTime) {
      toast.error("Choose a date and start time.");
      return;
    }

    if (durationSeconds <= 0 || durationSeconds > 86400) {
      toast.error("Duration must be between 1 minute and 24 hours.");
      return;
    }

    const didSave = await onSubmit({
      taskId: taskId || null,
      description: description.trim(),
      date,
      startTime,
      durationSeconds,
    });

    if (didSave) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        showCloseButton={!isSaving}
      >
        <DialogHeader>
          <DialogTitle>Add time manually</DialogTitle>
          <DialogDescription>
            Add work that was not captured with the live timer.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="manual-time-task">Task</Label>
            <select
              id="manual-time-task"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
              disabled={isSaving}
            >
              <option value="">General work</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-time-date">Date</Label>
              <Input
                id="manual-time-date"
                type="date"
                max={initialDateTime.maxDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={isSaving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-time-start">Start time</Label>
              <select
                id="manual-time-start"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={isSaving}
                required
              >
                {TIME_OPTIONS.map((timeOption) => (
                  <option key={timeOption} value={timeOption}>
                    {timeOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Duration</legend>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-time-hours">Hours</Label>
                <Input
                  id="manual-time-hours"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="24"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-time-minutes">Minutes</Label>
                <Input
                  id="manual-time-minutes"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  step="1"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="manual-time-description">Note</Label>
            <Textarea
              id="manual-time-description"
              maxLength={500}
              placeholder="What did you work on?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
