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
        router.replace("/teams");
      } else {
        router.replace("/auth/login");
      }
    };

    checkSession();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p>Yönlendiriliyorsunuz...</p>
    </div>
  );
}
