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

export type TaskEditorProps = {
  task: Task;
  onSave: () => void;
  onCancel: () => void;
};

export type AddTaskFormProps = {
  userId: string;
  onTaskAdded: () => void;
  teamId: string;
};

export type TasksPageClientProps = {
  userId: string;
  teamId: string;
  initialTasks: Task[];
};
