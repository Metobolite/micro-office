"use client";

import { useEffect, useRef, useState } from "react";
import { Github, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LoginButtonProps } from "@/app/types/auth";

export default function LoginButton({
  redirectPath = "/teams",
}: LoginButtonProps) {
  const loginInProgress = useRef(false);
  const [pendingProvider, setPendingProvider] = useState<"google" | "github" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      loginInProgress.current = false;
      setPendingProvider(null);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleLogin = async (provider: "google" | "github") => {
    if (loginInProgress.current) return;
    loginInProgress.current = true;
    setPendingProvider(provider);
    setErrorMessage(null);

    try {
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

      if (error) throw error;
    } catch {
      setErrorMessage("Sign-in could not be started. Please check your connection and try again.");
      setPendingProvider(null);
      loginInProgress.current = false;
    }
  };

  return (
    <div className="flex w-full flex-col gap-3" aria-busy={pendingProvider !== null}>
      <div className="mb-1 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.35em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>secure access</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        onClick={() => handleLogin("google")}
        disabled={pendingProvider !== null}
        variant="outline"
        className="h-12 w-full justify-start rounded-xl border-border/70 bg-background/80 px-4! text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent/80 hover:shadow-md"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
          <path d="M12 2a9.96 9.96 0 0 1 6.29 2.226a1 1 0 0 1 .04 1.52l-1.51 1.362a1 1 0 0 1 -1.265 .06a6 6 0 1 0 2.103 6.836l.001 -.004h-3.66a1 1 0 0 1 -.992 -.883l-.007 -.117v-2a1 1 0 0 1 1 -1h6.945a1 1 0 0 1 .994 .89c.04 .367 .061 .737 .061 1.11c0 5.523 -4.477 10 -10 10s-10 -4.477 -10 -10s4.477 -10 10 -10z"></path>
        </svg>
        <span className="ml-2!">{pendingProvider === "google" ? "Connecting to Google..." : "Continue with Google"}</span>
        {pendingProvider === "google" ? <Loader2 className="ml-auto size-4 animate-spin" aria-hidden="true" /> : null}
      </Button>
      <Button
        type="button"
        onClick={() => handleLogin("github")}
        disabled={pendingProvider !== null}
        variant="outline"
        className="h-12 w-full justify-start rounded-xl border-border/70 bg-background/80 px-4! text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent/80 hover:shadow-md"
      >
        <Github className="h-5 w-5" aria-hidden="true" />
        <span className="ml-2!">{pendingProvider === "github" ? "Connecting to GitHub..." : "Continue with GitHub"}</span>
        {pendingProvider === "github" ? <Loader2 className="ml-auto size-4 animate-spin" aria-hidden="true" /> : null}
      </Button>
      {errorMessage ? <p role="alert" className="text-sm text-destructive">{errorMessage}</p> : null}
      <div className="mt-2 flex items-center justify-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Fast and secure sign-in</span>
      </div>
    </div>
  );
}
