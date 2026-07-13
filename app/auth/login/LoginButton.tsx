"use client";

import { Github } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { LoginButtonProps } from "@/app/types/auth";

export default function LoginButton({
  redirectPath = "/teams",
}: LoginButtonProps) {
  const handleLogin = async (provider: "google" | "github") => {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", redirectPath);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: provider === "github" ? "read:user user:email" : undefined,
      },
    });

    if (error) {
      alert("Sign-in failed: " + error.message);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={() => handleLogin("google")}
        className="inline-flex items-center justify-center gap-3 rounded-lg border bg-background px-6 py-2 text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold">
          G
        </span>
        Sign in with Google
      </button>
      <button
        type="button"
        onClick={() => handleLogin("github")}
        className="inline-flex items-center justify-center gap-3 rounded-lg border bg-background px-6 py-2 text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
      >
        <Github className="h-5 w-5" />
        Sign in with GitHub
      </button>
    </div>
  );
}
