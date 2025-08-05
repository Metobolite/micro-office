"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import AddTaskForm from "./AddTaskForm";
import Modal from "@/components/ui/modal";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Task } from "@/app/types/task";
import { toast } from "sonner";

export default function TasksPageClient({
  userId,
  teamId,
}: {
  userId: string;
  teamId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [editDueDate, setEditDueDate] = useState("");
  const [editDueTime, setEditDueTime] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const today = new Date().toISOString().split("T")[0];

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .order("status", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Hata:", error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("team_id", teamId);
    if (error) {
      alert("Görev silinirken hata oluştu: " + error.message);
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
      task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : ""
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
      toast.error("Başlık boş olamaz!");
      return;
    }

    const fullDate = editDueTime
      ? `${editDueDate}T${editDueTime}:00`
      : `${editDueDate}T00:00:00`;

    if (fullDate < today) {
      toast.error("Tarih geçmiş olamaz!");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        due_date: fullDate ? fullDate : null,
      })
      .eq("id", editingTask.id)
      .eq("team_id", teamId);

    if (error) {
      toast.error("Görev güncellenirken hata oluştu: " + error.message);
    } else {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title: editTitle,
                description: editDescription,
                priority: editPriority,
                due_date: editDueDate ? fullDate : null,
              }
            : task
        )
      );
      toast.success("Görev başarıyla güncellendi!");
      cancelEdit();
    }
  };

  const handleDragEnd = async (result: any) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

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
            }
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
        return "bg-gray-400 text-white";
    }
  };

  return (
    <>
      <div className="p-6 min-h-screen text-white relative">
        <div className="">
          <Button onClick={() => setShowAddModal(true)} className=" ">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Görev
          </Button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {["todo", "in_progress", "done"].map((status) => (
              <div
                key={status}
                className="flex flex-col bg-[#BCCCDC] p-4 rounded-md min-h-[300px] shadow-md text-card-foreground"
              >
                <h2 className="font-bold text-xl mb-4 capitalize sticky top-0">
                  {status.replace("_", " ")}{" "}
                  <span className="ml-2 text-[#1B3C53] font-semibold bg-[#F9F3EF] px-2 rounded-lg">
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
                              className="bg-[#F9F3EF] text-[#1B3C53] min-h-[80px] p-4 mb-3 rounded shadow relative"
                            >
                              {editingTask?.id === task.id ? (
                                <div className="transition-all duration-300 ease-in-out">
                                  <input
                                    className="w-full mb-2 p-1 border border-gray-300 rounded"
                                    value={editTitle}
                                    onChange={(e) =>
                                      setEditTitle(e.target.value)
                                    }
                                  />
                                  <textarea
                                    className="w-full p-1 border border-gray-300 rounded"
                                    value={editDescription}
                                    onChange={(e) =>
                                      setEditDescription(e.target.value)
                                    }
                                  />
                                  <select
                                    className="w-full p-1 border border-gray-300 rounded mb-2"
                                    value={editPriority}
                                    onChange={(e) =>
                                      setEditPriority(
                                        e.target.value as
                                          | "low"
                                          | "medium"
                                          | "high"
                                      )
                                    }
                                  >
                                    <option value="low">Düşük</option>
                                    <option value="medium">Orta</option>
                                    <option value="high">Yüksek</option>
                                  </select>
                                  <input
                                    type="date"
                                    className="w-full p-2 border border-gray-300 rounded text-black mb-2"
                                    value={editDueDate}
                                    onChange={(e) =>
                                      setEditDueDate(e.target.value)
                                    }
                                    min={today}
                                  />
                                  <input
                                    type="time"
                                    className="w-full p-2 border border-gray-300 rounded text-black mb-2"
                                    value={editDueTime}
                                    onChange={(e) =>
                                      setEditDueTime(e.target.value)
                                    }
                                  />

                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={saveEdit}
                                      className="bg-green-600 px-3 py-1 rounded text-white"
                                    >
                                      Kaydet
                                    </button>
                                    <button
                                      onClick={cancelEdit}
                                      className="bg-gray-400 px-3 py-1 rounded"
                                    >
                                      İptal
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
                                        task.priority
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
                                      ? "Süresiz"
                                      : formatDate(task.due_date)}
                                  </p>
                                  <div className="absolute top-2 right-2 flex gap-1">
                                    <button
                                      onClick={() => startEdit(task)}
                                      className="bg-[#09122C] px-2 py-1 rounded text-xs text-[#d5cbc4] font-semibold hover:bg-[#2b344d] transition duration-300"
                                      title="Düzenle"
                                    >
                                      Düzenle
                                    </button>
                                    <button
                                      onClick={() => {
                                        setTaskToDelete(task);
                                        setShowDeleteConfirm(true);
                                      }}
                                      className="bg-[#BE3144] text-[#d5cbc4] px-2 py-1 rounded text-xs font-semibold hover:bg-[#DC2525] transition duration-300"
                                      title="Sil"
                                    >
                                      Sil
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
        <div className="fixed inset-0 flex items-center justify-center bg-[#00000070] z-50">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full text-black modal-overlay">
            <h3 className="text-xl font-semibold mb-4">
              "{taskToDelete.title}" görevini silmek istediğinize emin misiniz?
            </h3>
            <div className="flex justify-end gap-4">
              <button
                onClick={confirmDelete}
                className="bg-[#BE3144] text-[#ebe7e5] px-4 py-2 rounded text-sm font-semibold hover:bg-[#DC2525] transition duration-300"
              >
                Evet, Sil
              </button>
              <button
                onClick={cancelDelete}
                className="bg-[#1B3C53] px-4 py-2 rounded text-sm font-semibold text-[#ebe7e5] hover:bg-[#34699A] transition duration-300"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
