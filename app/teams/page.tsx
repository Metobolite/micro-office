import { ThemeToggle } from "@/app/components/theme/theme-toggle";
import CreateTeamForm from "@/app/components/team/CreateTeamForm";
import { selectTeam } from "@/app/action/select-team";
import {
  getMembershipTeam,
  getTeamMemberships,
} from "@/app/lib/team-context";
import { getCurrentIdentity } from "@/app/lib/supabaseServer";
import type { TeamListItem } from "@/app/types/team";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function formatJoinedAt(joinedAt: string | null) {
  if (!joinedAt) return "Unknown";

  return new Date(joinedAt).toLocaleDateString("en-US", {
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
  const { user, error } = await getCurrentIdentity();

  if (!user || error) {
    redirect("/auth/login");
  }

  const { memberships } = await getTeamMemberships(user.id);

  const teamList: TeamListItem[] = memberships
    .map((membership) => {
      const team = getMembershipTeam(membership);

      if (!team) return null;

      return {
        id: team.id,
        name: team.name,
        team_id: membership.team_id,
        role: membership.role,
        status: membership.status,
        joined_at: membership.joined_at,
        joinedLabel: formatJoinedAt(membership.joined_at),
        statusLabel: membership.status || "active",
      };
    })
    .filter((item): item is TeamListItem => item !== null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 rounded-3xl border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit">
                Project Teams
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Your teams
              </h1>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                <Link
                  href="/teams/new"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground! transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create new team</span>
                </Link>
                <ThemeToggle />
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <span className="block text-xs uppercase tracking-wide">
                    Total projects
                  </span>
                  <span className="mt-1 block text-2xl font-semibold text-foreground">
                    {teamList.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {teamList.length === 0 ? (
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-dashed bg-muted p-8">
                <div className="flex items-center gap-3 text-foreground">
                  <Users className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">No teams yet</h2>
                </div>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  This user is not connected to any projects yet. Teams will
                  appear here after you create your first project or join one.
                </p>
              </div>

              <CreateTeamForm
                userId={user.id}
                userName={
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  ""
                }
                userEmail={user.email || ""}
              />
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {teamList.map((team) => (
                <form
                  action={selectTeam}
                  key={`${team.id}-${team.team_id}`}
                >
                  <input type="hidden" name="teamId" value={team.id} />
                  <Card className="relative cursor-pointer overflow-hidden border-border shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <button
                      type="submit"
                      className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label={`Open ${team.name || "untitled project"}`}
                    />
                    <CardHeader className="bg-primary text-primary-foreground rounded-xl py-3 gap-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <Badge
                            variant="secondary"
                            className="w-fit uppercase"
                          >
                            Team
                          </Badge>
                          <CardTitle className="text-2xl leading-tight uppercase">
                            {team.name || "Untitled project"}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">
                          Status
                        </span>
                        <Badge variant={getStatusVariant(team.statusLabel)}>
                          {team.statusLabel}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">
                          Joined
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {team.joinedLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">
                          Project ID
                        </span>
                        <span className="max-w-[200px] truncate text-sm font-medium text-foreground">
                          {team.team_id}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </form>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
