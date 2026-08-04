"use client";

import { Github, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LoginButtonProps } from "@/app/types/auth";

export default function LoginButton({
  redirectPath = "/teams",
}: LoginButtonProps) {
  const handleLogin = async (provider: "google" | "github") => {
    const { supabase } = await import("../../lib/supabase");
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
      <div className="mb-1 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.35em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>secure access</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        onClick={() => handleLogin("google")}
        variant="outline"
        className="h-12 w-full justify-start rounded-xl border-border/70 bg-background/80 px-4 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent/80 hover:shadow-md"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
          G
        </span>
        <span className="ml-2">Continue with Google</span>
      </Button>
      <Button
        type="button"
        onClick={() => handleLogin("github")}
        variant="outline"
        className="h-12 w-full justify-start rounded-xl border-border/70 bg-background/80 px-4 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent/80 hover:shadow-md"
      >
        <Github className="h-5 w-5" />
        <span className="ml-1">Continue with GitHub</span>
      </Button>
      <div className="mt-2 flex items-center justify-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Fast and secure sign-in</span>
      </div>
    </div>
  );
}
