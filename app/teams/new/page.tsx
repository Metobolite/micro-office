import { ThemeToggle } from "@/app/components/theme";
import CreateTeamForm from "@/app/components/team/CreateTeamForm";
import { createClient } from "@/app/lib/supabaseServer";
import { redirect } from "next/navigation";

export default async function NewTeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <ThemeToggle className="absolute right-6 top-6" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <CreateTeamForm userId={user.id} />
      </div>
    </div>
  );
}
