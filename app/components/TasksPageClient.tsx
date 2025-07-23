"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import AddTaskForm from "./AddTaskForm";
import Modal from "@/components/ui/modal";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  sort_order: number;
};

export default function TasksPageClient({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
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
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
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
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditTitle("");
    setEditDescription("");
  };

  const saveEdit = async () => {
    if (!editingTask) return;

    const { error } = await supabase
      .from("tasks")
      .update({ title: editTitle, description: editDescription })
      .eq("id", editingTask.id);

    if (error) {
      alert("Görev güncellenirken hata oluştu: " + error.message);
    } else {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? { ...task, title: editTitle, description: editDescription }
            : task
        )
      );
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
          .eq("id", task.id);
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
          .eq("id", task.id);
      }
    }
  };

  const getTasksByStatus = (status: string) =>
    tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <div className="p-6 min-h-screen text-white relative">
        {/* Yeni Görev Butonu */}
        <div className="">
          <Button onClick={() => setShowAddModal(true)} className=" ">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Görev
          </Button>
        </div>

        {/* Görev Listesi */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {["todo", "in_progress", "done"].map((status) => (
              <div
                key={status}
                className="flex flex-col bg-[#BCCCDC] p-4 rounded-md min-h-[300px] shadow-md text-card-foreground"
              >
                <h2 className="font-bold text-xl mb-4 capitalize sticky top-0">
                  {status.replace("_", " ")}
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
                              className="bg-[#F9F3EF] text-[#1B3C53] p-4 mb-3 rounded shadow relative"
                            >
                              {editingTask?.id === task.id ? (
                                <>
                                  <input
                                    className="w-full mb-2 p-1 border border-gray-300 rounded"
                                    value={editTitle}
                                    onChange={(e) =>
                                      setEditTitle(e.target.value)
                                    }
                                  />
                                  <textarea
                                    className="w-full mb-2 p-1 border border-gray-300 rounded"
                                    value={editDescription}
                                    onChange={(e) =>
                                      setEditDescription(e.target.value)
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
                                </>
                              ) : (
                                <>
                                  <h3 className="font-semibold">
                                    {task.title}
                                  </h3>
                                  <p className="text-sm">{task.description}</p>
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
                                </>
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

      {/* Yeni Görev Modalı */}
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)}>
        <AddTaskForm
          userId={userId}
          onTaskAdded={() => {
            setShowAddModal(false);
            fetchTasks();
          }}
        />
      </Modal>

      {/* Silme onay modalı */}
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
