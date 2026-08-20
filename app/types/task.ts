export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  sort_order: number;
  due_date?: string | null;
}

export type AddTaskFormProps = {
  userId: string;
  onTaskAdded: (task: Task) => void;
  teamId: string;
  sortOrder: number;
};

export type TasksPageClientProps = {
  userId: string;
  teamId: string;
  initialTasks: Task[];
  initialLoadFailed?: boolean;
};
