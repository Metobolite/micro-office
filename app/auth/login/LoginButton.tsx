"use client";

import { supabase } from "../../lib/supabase";

export default function LoginButton() {
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert("Giriş başarısız: " + error.message);
    }
  };

  return (
    <button
      onClick={handleLogin}
      className="rounded-lg border bg-background px-6 py-2 text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
    >
      Google ile Giriş Yap
    </button>
  );
}
