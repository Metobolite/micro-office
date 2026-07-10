"use client";

import { supabase } from "@/app/lib/supabase";
import { Task } from "@/app/types/task";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import AddTaskForm from "./AddTaskForm";

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export default function TasksPageClient({
  userId,
  teamId,
  initialTasks,
}: {
  userId: string;
  teamId: string;
  initialTasks: Task[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showAddModal, setShowAddModal] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">(
    "medium",
  );
  const [editDueDate, setEditDueDate] = useState("");
  const [editDueTime, setEditDueTime] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const today = new Date().toISOString().split("T")[0];

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .order("status", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error:", error);
    } else {
      setTasks(data || []);
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("team_id", teamId);
    if (error) {
      alert("Task could not be deleted: " + error.message);
    } else {
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    }
  };

  const confirmDelete = () => {
    if (!taskToDelete) return;
    deleteTask(taskToDelete.id);
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditPriority(task.priority);
    setEditDueDate(
      task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : "",
    );
    setEditDueTime(task.due_date ? task.due_date.slice(11, 16) : "");
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditTitle("");
    setEditDescription("");
    setEditPriority("medium");
    setEditDueDate("");
    setEditDueTime("");
  };

  const saveEdit = async () => {
    if (!editingTask) return;

    if (!editTitle.trim()) {
      toast.error("Title cannot be empty.");
      return;
    }

    const fullDate = editDueDate
      ? editDueTime
        ? `${editDueDate}T${editDueTime}:00`
        : `${editDueDate}T00:00:00`
      : null;

    if (editDueDate && editDueDate < today) {
      toast.error("Date cannot be in the past.");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        due_date: fullDate,
      })
      .eq("id", editingTask.id)
      .eq("team_id", teamId);

    if (error) {
      toast.error("Task could not be updated: " + error.message);
    } else {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title: editTitle,
                description: editDescription,
                priority: editPriority,
                due_date: fullDate,
              }
            : task,
        ),
      );
      toast.success("Task updated successfully.");
      cancelEdit();
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceStatus = source.droppableId as Task["status"];
    const destStatus = destination.droppableId as Task["status"];

    if (sourceStatus === destStatus) {
      const tasksInColumn = tasks
        .filter((t) => t.status === sourceStatus)
        .sort((a, b) => a.sort_order - b.sort_order);

      const [moved] = tasksInColumn.splice(source.index, 1);
      tasksInColumn.splice(destination.index, 0, moved);

      const updatedTasks = tasks.map((t) =>
        t.status !== sourceStatus
          ? t
          : {
              ...t,
              sort_order: tasksInColumn.findIndex((x) => x.id === t.id),
            },
      );

      setTasks(updatedTasks);

      for (const task of tasksInColumn) {
        await supabase
          .from("tasks")
          .update({ sort_order: tasksInColumn.indexOf(task) })
          .eq("id", task.id)
          .eq("team_id", teamId);
      }
    } else {
      const sourceTasks = tasks
        .filter((t) => t.status === sourceStatus)
        .sort((a, b) => a.sort_order - b.sort_order);
      const destTasks = tasks
        .filter((t) => t.status === destStatus)
        .sort((a, b) => a.sort_order - b.sort_order);

      const [moved] = sourceTasks.splice(source.index, 1);
      moved.status = destStatus;
      destTasks.splice(destination.index, 0, moved);

      const updatedTasks = tasks.map((t) => {
        if (t.id === moved.id) {
          return {
            ...moved,
            sort_order: destination.index,
          };
        }
        if (t.status === sourceStatus) {
          const index = sourceTasks.findIndex((x) => x.id === t.id);
          return { ...t, sort_order: index };
        }
        if (t.status === destStatus) {
          const index = destTasks.findIndex((x) => x.id === t.id);
          return { ...t, sort_order: index };
        }
        return t;
      });

      setTasks(updatedTasks);

      const updates = [...sourceTasks, ...destTasks];
      for (const task of updates) {
        await supabase
          .from("tasks")
          .update({
            sort_order:
              task.status === moved.status
                ? destTasks.findIndex((x) => x.id === task.id)
                : sourceTasks.findIndex((x) => x.id === task.id),
            status: task.status,
          })
          .eq("id", task.id)
          .eq("team_id", teamId);
      }
    }
  };

  const getTasksByStatus = (status: string) =>
    tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.sort_order - b.sort_order);

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-600 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-green-600 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <div className="relative min-h-screen p-6 text-foreground">
        <div className="mb-4 flex items-center justify-end">
          <Button
            onClick={() => setShowAddModal(true)}
            className="h-11 rounded-full px-5 font-semibold shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {["todo", "in_progress", "done"].map((status) => (
              <div
                key={status}
                className="flex flex-col bg-card p-4 rounded-2xl min-h-[300px] shadow-md text-card-foreground"
              >
                <h2 className="font-bold text-xl mb-4 capitalize sticky top-0">
                  {statusLabels[status] ?? status.replace("_", " ")}{" "}
                  <span className="ml-2 rounded-lg bg-muted px-2 font-semibold text-muted-foreground">
                    {getTasksByStatus(status).length}
                  </span>
                </h2>
                <Droppable droppableId={status}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 min-h-[100px]"
                    >
                      {getTasksByStatus(status).map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="relative mb-3 min-h-[80px] rounded-2xl border bg-background p-4 text-foreground shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                            >
                              {editingTask?.id === task.id ? (
                                <div className="space-y-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-[0_18px_50px_rgba(15,23,42,0.12)] transition-all duration-300 ease-in-out">
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                      Edit Task
                                    </p>
                                    <h3 className="text-lg font-semibold text-foreground">
                                      Update details
                                    </h3>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                      Title
                                    </label>
                                    <input
                                      className="h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                                      value={editTitle}
                                      onChange={(e) =>
                                        setEditTitle(e.target.value)
                                      }
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                      Description
                                    </label>
                                    <textarea
                                      className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                                      value={editDescription}
                                      onChange={(e) =>
                                        setEditDescription(e.target.value)
                                      }
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                      Priority
                                    </label>
                                    <select
                                      className="h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                                      value={editPriority}
                                      onChange={(e) =>
                                        setEditPriority(
                                          e.target.value as
                                            | "low"
                                            | "medium"
                                            | "high",
                                        )
                                      }
                                    >
                                      <option value="low">Low</option>
                                      <option value="medium">Medium</option>
                                      <option value="high">High</option>
                                    </select>
                                  </div>

                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-foreground">
                                        Due Date
                                      </label>
                                      <input
                                        type="date"
                                        className="h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                                        value={editDueDate}
                                        onChange={(e) =>
                                          setEditDueDate(e.target.value)
                                        }
                                        min={today}
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-foreground">
                                        Time
                                      </label>
                                      <input
                                        type="time"
                                        className="h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                                        value={editDueTime}
                                        onChange={(e) =>
                                          setEditDueTime(e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                                    <button
                                      onClick={saveEdit}
                                      className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={cancelEdit}
                                      className="h-11 rounded-full border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="transition-all duration-300 ease-in-out">
                                  <div className="flex justify-between items-start">
                                    <h3 className="font-semibold">
                                      {task.title}
                                    </h3>
                                    <span
                                      className={`text-xs px-2 py-1 rounded absolute bottom-2 right-2 ${getPriorityBadgeColor(
                                        task.priority,
                                      )}`}
                                    >
                                      {task.priority}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-1">
                                    {task.description}
                                  </p>
                                  <p className="text-xs mt-1">
                                    {!task.due_date || task.due_date === null
                                      ? "No due date"
                                      : formatDate(task.due_date)}
                                  </p>
                                  <div className="absolute top-2 right-2 flex gap-1">
                                    <button
                                      onClick={() => startEdit(task)}
                                      className="rounded bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground transition duration-300 hover:bg-secondary/80"
                                      title="Edit"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setTaskToDelete(task);
                                        setShowDeleteConfirm(true);
                                      }}
                                      className="rounded bg-destructive px-2 py-1 text-xs font-semibold text-white transition duration-300 hover:bg-destructive/90"
                                      title="Delete"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      <Modal show={showAddModal} onClose={() => setShowAddModal(false)}>
        <AddTaskForm
          userId={userId}
          onTaskAdded={() => {
            setShowAddModal(false);
            fetchTasks();
          }}
          teamId={teamId}
        />
      </Modal>

      {showDeleteConfirm && taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="modal-overlay w-full max-w-sm rounded border bg-card p-6 text-card-foreground shadow">
            <h3 className="text-xl font-semibold mb-4">
              Are you sure you want to delete &quot;{taskToDelete.title}&quot;?
            </h3>
            <div className="flex justify-end gap-4">
              <button
                onClick={confirmDelete}
                className="rounded bg-destructive px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:bg-destructive/90"
              >
                Yes, delete
              </button>
              <button
                onClick={cancelDelete}
                className="rounded bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition duration-300 hover:bg-secondary/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
