"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/app/components/dashboard/dashboard-header";
import { StatsCards } from "@/app/components/dashboard/stats-cards";
import { RecentTasks } from "@/app/components/dashboard/recent-tasks";
import { TeamMembers } from "@/app/components/dashboard/team-members";
import { RecentMessages } from "@/app/components/dashboard/recent-messages";
import { RecentFiles } from "@/app/components/dashboard/recent-files";

export default function DashboardPage() {
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data?.user) {
        router.push("/auth/login");
      } else {
        setUserName(data.user.user_metadata.full_name ?? "");
      }
    });
  }, []);

  const handleLogout = async () => {
    const res = await fetch("/auth/logout", {
      method: "POST",
    });

    if (res.redirected) {
      router.push(res.url);
    } else {
      router.push("/auth/login");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <StatsCards />
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <RecentTasks />
          <TeamMembers />
          <RecentMessages />
        </div>
        <RecentFiles />
      </div>
    </div>
  );
}
