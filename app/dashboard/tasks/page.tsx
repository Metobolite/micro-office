import { Task } from "../../types/task";

const fakeTasks: Task[] = [
  {
    id: "1",
    title: "Ana Sayfa Tasarımı",
    description: "Landing page UI",
    status: "todo",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "API Bağlantısı",
    description: "Veritabanı bağlantısı kur",
    status: "doing",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Kayıt Formu",
    description: "NextAuth ile form",
    status: "done",
    createdAt: new Date().toISOString(),
  },
];

export default function TaskPage() {
  const statusGroups = ["todo", "doing", "done"] as const;

  return (
    <div className="flex gap-6 p-8">
      {statusGroups.map((status) => (
        <div key={status} className="flex-1 bg-gray-100 p-4 rounded shadow">
          <h2 className="text-xl font-semibold capitalize mb-4">{status}</h2>
          <div className="flex flex-col gap-2">
            {fakeTasks
              .filter((task) => task.status === status)
              .map((task) => (
                <div key={task.id} className="bg-white p-3 rounded shadow">
                  <h3 className="font-medium">{task.title}</h3>
                  <p className="text-sm text-gray-600">{task.description}</p>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}