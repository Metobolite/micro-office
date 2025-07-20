import TaskCard from "./TaskCard";

export default function TaskColumn({ title, columnId, tasks }: any) {
  return (
    <div className="bg-gray-100 p-4 rounded-md space-y-4">
      <h2 className="font-bold text-xl mb-2">{title}</h2>
      {tasks.map((task: any) => (
        <TaskCard
          key={task.id}
          task={task}
          onStatusChange={() => window.location.reload()}
        />
      ))}
    </div>
  );
}
