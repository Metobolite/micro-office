export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string;
  createdAt: string;
  dueDate?: string;
}