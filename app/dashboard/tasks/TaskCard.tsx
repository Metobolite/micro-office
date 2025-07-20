'use client';

import { updateTaskStatus } from "../../lib/supabaseOps";

type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
};

const nextStatus = {
  todo: "in_progress",
  in_progress: "done",
  done: "done",
};

export default function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: () => void }) {
  const handleAdvance = async () => {
    const newStatus = nextStatus[task.status as keyof typeof nextStatus];
    if (newStatus !== task.status) {
      await updateTaskStatus(task.id, newStatus);
      onStatusChange();
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md space-y-2">
      <h3 className="font-bold text-lg">{task.title}</h3>
      <p className="text-gray-600">{task.description}</p>
      <button
        onClick={handleAdvance}
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      >
        Durumu İlerle
      </button>
    </div>
  );
}
