import { ThemeToggle } from "@/app/components/theme/theme-toggle";
import CreateTeamForm from "@/app/components/team/CreateTeamForm";
import { getResolvedProfileAvatarUrl } from "@/app/lib/profile-avatar";
import { getCurrentUser } from "@/app/lib/supabaseServer";
import { redirect } from "next/navigation";

export default async function NewTeamPage() {
  const { user, error } = await getCurrentUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <ThemeToggle className="absolute right-6 top-6" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <CreateTeamForm
          userId={user.id}
          userName={
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ""
          }
          userEmail={user.email || ""}
          userAvatarUrl={getResolvedProfileAvatarUrl(
            user.user_metadata,
            user.id,
          )}
        />
      </div>
    </div>
  );
}
