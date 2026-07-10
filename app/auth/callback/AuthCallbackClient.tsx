"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/teams";
  }

  return nextPath;
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"));

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace(nextPath);
      } else {
        router.replace(`/auth/login?next=${encodeURIComponent(nextPath)}`);
      }
    };

    checkSession();
  }, [nextPath, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p>Redirecting...</p>
    </div>
  );
}
