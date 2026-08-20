import type { Task, TaskPriority, TaskStatus } from "@/app/types/task";
import {
  CheckCircle2,
  Circle,
  Clock3,
  type LucideIcon,
} from "lucide-react";

export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  {
    label: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    icon: LucideIcon;
    iconClassName: string;
    dotClassName: string;
  }
> = {
  todo: {
    label: "To do",
    description: "Ready to be picked up",
    emptyTitle: "Nothing queued",
    emptyDescription: "New tasks will start here.",
    icon: Circle,
    iconClassName: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    dotClassName: "bg-slate-400",
  },
  in_progress: {
    label: "In progress",
    description: "Work currently in motion",
    emptyTitle: "No active tasks",
    emptyDescription: "Drag a task here when work begins.",
    icon: Clock3,
    iconClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500",
  },
  done: {
    label: "Done",
    description: "Completed work",
    emptyTitle: "No completed tasks",
    emptyDescription: "Finished tasks will collect here.",
    icon: CheckCircle2,
    iconClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
};

export const TASK_PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; className: string }
> = {
  high: {
    label: "High",
    className:
      "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  medium: {
    label: "Medium",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  low: {
    label: "Low",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

const dueDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dueTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
});

export function getSortedTasks(tasks: Task[], status: TaskStatus) {
  return tasks
    .filter((task) => task.status === status)
    .sort((firstTask, secondTask) => {
      const firstOrder = Number.isFinite(firstTask.sort_order)
        ? firstTask.sort_order
        : 0;
      const secondOrder = Number.isFinite(secondTask.sort_order)
        ? secondTask.sort_order
        : 0;

      return firstOrder - secondOrder;
    });
}

export function getDueDateMeta(task: Task) {
  if (!task.due_date) return null;

  const dueDate = new Date(task.due_date);
  if (Number.isNaN(dueDate.getTime())) return null;

  const now = new Date();
  const todayValue = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const dueDayValue = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  ).getTime();
  const hasSpecificTime =
    dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0;
  const isOverdue =
    task.status !== "done" &&
    (hasSpecificTime
      ? dueDate.getTime() < now.getTime()
      : dueDayValue < todayValue);
  const isDueToday = task.status !== "done" && dueDayValue === todayValue;
  const formattedDueDate = `${dueDateFormatter.format(dueDate)}${
    hasSpecificTime ? ` · ${dueTimeFormatter.format(dueDate)}` : ""
  }`;

  return {
    isOverdue,
    label: `${isOverdue ? "Overdue · " : isDueToday ? "Today · " : ""}${formattedDueDate}`,
    className: isOverdue
      ? "text-red-600 dark:text-red-400"
      : isDueToday
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground",
  };
}
