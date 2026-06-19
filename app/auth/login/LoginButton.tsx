"use client";

import { supabase } from "../../lib/supabase"; // createBrowserClient olan
import { useRouter } from "next/navigation";

export default function LoginButton() {
  const router = useRouter();

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
      className="bg-white text-black px-6 py-2 rounded-lg hover:bg-gray-200 transition"
    >
      Google ile Giriş Yap
    </button>
  );
}
