// app/auth/login/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabaseServer"; // senin server client'ın
import LoginButton from "./LoginButton"; // Client bileşen

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-10 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Giriş Yap</h1>
        <LoginButton />
      </div>
    </div>
  );
}
