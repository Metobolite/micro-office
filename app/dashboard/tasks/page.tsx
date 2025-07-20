"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AddTaskForm from "../../components/AddTaskForm";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  sort_order: number;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
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

      const updated = tasks.map((t) =>
        t.status !== sourceStatus
          ? t
          : {
              ...t,
              sort_order: tasksInColumn.findIndex((x) => x.id === t.id),
            }
      );

      setTasks(updated);

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
    <div className="p-6 bg-[#1B3C53] min-h-screen text-white">
      <AddTaskForm onTaskAdded={fetchTasks} />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {["todo", "in_progress", "done"].map((status) => (
            <Droppable droppableId={status} key={status}>
              {(provided) => (
                <div className="bg-[#456882] p-4 rounded-md min-h-[300px] flex flex-col">
                  <h2 className="font-bold text-xl mb-4 capitalize pointer-events-none">
                    {status.replace("_", " ")}
                  </h2>
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
                            className="bg-[#F9F3EF] text-[#1B3C53] p-4 mb-3 rounded shadow"
                          >
                            <h3 className="font-semibold">{task.title}</h3>
                            <p className="text-sm">{task.description}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
