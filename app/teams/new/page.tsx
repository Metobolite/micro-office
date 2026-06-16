import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabaseServer";
import CreateTeamForm from "@/app/components/team/CreateTeamForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <CreateTeamForm userId={user.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
