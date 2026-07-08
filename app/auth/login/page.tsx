import { ThemeToggle } from "@/app/components/theme";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabaseServer";
import LoginButton from "./LoginButton";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/teams");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <ThemeToggle className="absolute right-6 top-6" />
      <div className="rounded-xl border bg-card p-10 text-card-foreground shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold">Giriş Yap</h1>
        <LoginButton />
      </div>
    </div>
  );
}
