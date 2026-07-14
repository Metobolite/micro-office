import type { TaskPriority, TaskStatus } from "@/app/types/task";

export type TimeTrackerTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
};

export type TimeEntryStatus = "running" | "paused" | "stopped";

export type TimeEntry = {
  id: string;
  team_id: string;
  user_id: string;
  task_id: string | null;
  task_title: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_sec: number | null;
  status: TimeEntryStatus;
  active_started_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TrackerPeriod = "today" | "week" | "all";

export type TimeEntrySummary = {
  today_seconds: number;
  week_seconds: number;
  total_seconds: number;
  week_sessions: number;
  entry_count: number;
  active_entry_id: string | null;
  active_status: Extract<TimeEntryStatus, "running" | "paused"> | null;
  active_entry: TimeEntry | null;
  active_duration_seconds: number;
  today_entry_ids: string[];
  week_entry_ids: string[];
  task_breakdown: Array<{
    task_id: string | null;
    task_title: string | null;
    seconds: number;
  }>;
};

export type ManualTimeEntryInput = {
  taskId: string | null;
  description: string;
  date: string;
  startTime: string;
  durationSeconds: number;
};

export type TeamTimeTrackerProps = {
  userId: string;
  teamId: string;
  teamName?: string | null;
  initialTasks: TimeTrackerTask[];
};

export type ManualTimeEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: TimeTrackerTask[];
  isSaving: boolean;
  onSubmit: (entry: ManualTimeEntryInput) => Promise<boolean>;
};
