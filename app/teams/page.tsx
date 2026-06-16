import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabaseServer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Users } from "lucide-react";
import CreateTeamForm from "@/app/components/team/CreateTeamForm";
import Link from "next/link";

type TeamRow = {
  id: string;
  name: string | null;
  owner_id: string | null;
};

type TeamMembershipRow = {
  team_id: string;
  role: string | null;
  status: string | null;
  joined_at: string | null;
};

type TeamListItem = TeamRow &
  TeamMembershipRow & {
    joinedLabel: string;
    statusLabel: string;
  };

function formatJoinedAt(joinedAt: string | null) {
  if (!joinedAt) return "Belirsiz";

  return new Date(joinedAt).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusVariant(status: string | null) {
  if (status === "active" || status === "online") return "default";
  if (status === "invited") return "secondary";
  if (status === "away") return "outline";

  return "secondary";
}

export default async function TeamsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, role, status, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const teamIds = Array.from(
    new Set((memberships || []).map((membership) => membership.team_id)),
  );

  const { data: teams } = teamIds.length
    ? await supabase
        .from("teams")
        .select("id, name, owner_id")
        .in("id", teamIds)
    : { data: [] as TeamRow[] };

  const teamsById = new Map((teams || []).map((team) => [team.id, team]));

  const teamList: TeamListItem[] = (memberships || [])
    .map((membership) => {
      const team = teamsById.get(membership.team_id);

      if (!team) return null;

      return {
        ...team,
        ...membership,
        joinedLabel: formatJoinedAt(membership.joined_at),
        statusLabel: membership.status || "active",
      };
    })
    .filter((item): item is TeamListItem => item !== null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit">
                Proje Ekipleri
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Senin ekiplerin
              </h1>
            </div>

            <div>
              <Link
                href="/teams/new"
                className="inline-flex items-center gap-2 mb-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                <Plus className="h-5 w-5 text-white" />
                <span className="text-white">Yeni ekip oluştur</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="block text-xs uppercase tracking-wide text-slate-500">
                    Toplam proje
                  </span>
                  <span className="mt-1 block text-2xl font-semibold text-slate-900">
                    {teamList.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {teamList.length === 0 ? (
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8">
                <div className="flex items-center gap-3 text-slate-900">
                  <Users className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Henüz ekip yok</h2>
                </div>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  Bu kullanıcıya bağlı bir proje bulunmuyor. İlk projeyi
                  oluşturduğunda ya da bir projeye eklendiğinde ekipler burada
                  listelenecek.
                </p>
              </div>

              <CreateTeamForm userId={user.id} />
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {teamList.map((team) => (
                <Link
                  href={`/dashboard?teamId=${team.id}`}
                  key={`${team.id}-${team.team_id}`}
                >
                  <Card
                    key={`${team.id}-${team.team_id}`}
                    className="overflow-hidden border-slate-200 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardHeader className="space-y-4 bg-slate-950 text-white">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <Badge
                            variant="secondary"
                            className="w-fit text-slate-950 uppercase"
                          >
                            {team.role || "member"}
                          </Badge>
                          <CardTitle className="text-2xl leading-tight uppercase">
                            {team.name || "İsimsiz proje"}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-500">Durum</span>
                        <Badge variant={getStatusVariant(team.statusLabel)}>
                          {team.statusLabel}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-500">Katılım</span>
                        <span className="text-sm font-medium text-slate-900">
                          {team.joinedLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-500">Proje ID</span>
                        <span className="max-w-[200px] truncate text-sm font-medium text-slate-900">
                          {team.team_id}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
