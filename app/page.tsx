"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setLoggedIn(true);
      }
    };

    checkSession();
  }, []);

  const handleClick = () => {
    if (loggedIn) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/auth/login";
    }
  };

  return (
    <main>
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#1B3C53] text-white">
        <h1 className="text-[96px] font-bold mb-6">Welcome to Micro Office</h1>
        <div className="flex flex-col text-center gap-4">
          <p>Micro Office is a simple task management app.</p>
          <h2>Please sign in to continue.</h2>
          <button
            onClick={handleClick}
            className="bg-[#D2C1B6] text-black text-2xl px-6 py-2 rounded-lg hover:bg-[#e9d6cb] transition duration-300 hover:-translate-y-1 hover:shadow-[#F9F3EF] hover:shadow-md"
          >
            {loggedIn ? "Go to Dashboard" : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
