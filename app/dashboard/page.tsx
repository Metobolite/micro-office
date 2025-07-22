"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen bg-[#1B3C53] p-8 text-black">
      <div className="max-w-xl mx-auto bg-[#456882] shadow-lg p-6 rounded-lg">
        <h1 className="text-2xl text-white font-bold mb-4">Dashboard</h1>
        <p className="text-white mb-4">
          Hoş geldin: <strong>{userName}</strong>
        </p>
        <div className="flex justify-between">
          <button
            onClick={handleLogout}
            className="mt-6 bg-[#D2C1B6] text-black font-bold px-4 py-2 rounded hover:bg-[#e9d6ca] transform duration-300"
          >
            Çıkış Yap
          </button>
          <button
            onClick={() => router.push("/dashboard/tasks")}
            className="mt-6 bg-[#D2C1B6] text-black font-bold px-4 py-2 rounded hover:bg-[#e9d6ca] transform duration-300"
          >
            Görevlere Git
          </button>
          <button
            onClick={() => router.push("/dashboard/chat")}
            className="mt-6 bg-[#D2C1B6] text-black font-bold px-4 py-2 rounded hover:bg-[#e9d6ca] transform duration-300"
          >
            Chat'e Git
          </button>
        </div>
      </div>
    </div>
  );
}
