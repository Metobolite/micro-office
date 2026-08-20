"use client";

import { TIME_OPTIONS } from "@/app/lib/dateTime";
import type { TaskPriority } from "@/app/types/task";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TaskFormFieldsProps = {
  idPrefix: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string;
  minimumDueDate: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onDueDateChange: (value: string) => void;
  onDueTimeChange: (value: string) => void;
};

export default function TaskFormFields({
  idPrefix,
  title,
  description,
  priority,
  dueDate,
  dueTime,
  minimumDueDate,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  onDueDateChange,
  onDueTimeChange,
}: TaskFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="What needs to be done?"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          className="min-h-28 resize-y"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Add helpful context or a definition of done."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-priority`}>Priority</Label>
        <select
          id={`${idPrefix}-priority`}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          value={priority}
          onChange={(event) =>
            onPriorityChange(event.target.value as TaskPriority)
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-due-date`}>Due date</Label>
          <Input
            id={`${idPrefix}-due-date`}
            type="date"
            min={minimumDueDate}
            value={dueDate}
            onChange={(event) => onDueDateChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-due-time`}>Time</Label>
          <select
            id={`${idPrefix}-due-time`}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
            value={dueTime}
            disabled={!dueDate}
            onChange={(event) => onDueTimeChange(event.target.value)}
          >
            <option value="">No specific time</option>
            {dueTime && !TIME_OPTIONS.includes(dueTime) ? (
              <option value={dueTime}>{dueTime}</option>
            ) : null}
            {TIME_OPTIONS.map((timeOption) => (
              <option key={timeOption} value={timeOption}>
                {timeOption}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
