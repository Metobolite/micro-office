"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/auth/login");
      }
    };

    checkSession();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen text-white bg-black">
      <p>Yönlendiriliyorsunuz...</p>
    </div>
  );
}
