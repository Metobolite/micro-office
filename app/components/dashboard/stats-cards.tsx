"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, Users, FileText } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

export function StatsCards() {
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [teamMembers, setTeamMembers] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      // Görevleri getir
      const { data: tasks, error: taskError } = await supabase
        .from("tasks")
        .select("*");

      if (taskError) {
        console.error("Görevleri alırken hata:", taskError.message);
      } else {
        setTotalTasks(tasks.length);
        setCompletedTasks(
          tasks.filter((task) => task.status === "done").length
        );
      }

      // Takım üyelerini getir
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("*");

      if (userError) {
        console.error("Kullanıcıları alırken hata:", userError.message);
      } else {
        setTeamMembers(users.length);
      }

      // Dosyaları getir
      const { data: files, error: fileError } = await supabase
        .from("files")
        .select("*");

      if (fileError) {
        console.error("Dosyaları alırken hata:", fileError.message);
      } else {
        setTotalFiles(files.length);
      }
    };

    fetchStats();
  }, []);

  const stats = [
    {
      title: "Toplam Görevler",
      value: totalTasks,
      change: "+12%", // örnek statik değer
      icon: CheckSquare,
      color: "text-blue-600",
    },
    {
      title: "Tamamlanan",
      value: completedTasks,
      change: "+8%", // örnek statik değer
      icon: Clock,
      color: "text-green-600",
    },
    {
      title: "Takım Üyeleri",
      value: teamMembers,
      change: "+2", // örnek statik değer
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Dosyalar",
      value: totalFiles,
      change: "+24", // örnek statik değer
      icon: FileText,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stat.change}</span> geçen aydan
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
