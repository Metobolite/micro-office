"use server";

import { setStoredActiveTeamId } from "@/app/lib/active-team";
import { getTeamMemberships } from "@/app/lib/team-context";
import { isValidTeamId } from "@/app/lib/team-cookie";
import { getCurrentIdentity } from "@/app/lib/supabaseServer";
import { redirect } from "next/navigation";

export async function selectTeam(formData: FormData) {
  const teamId = formData.get("teamId");

  if (!isValidTeamId(teamId)) {
    redirect("/teams");
  }

  const { user, error } = await getCurrentIdentity();
  if (!user || error) {
    redirect("/auth/login");
  }

  const { memberships, error: membershipError } =
    await getTeamMemberships(user.id);
  const canAccessTeam =
    !membershipError &&
    memberships.some((membership) => membership.team_id === teamId);

  if (!canAccessTeam) {
    redirect("/teams");
  }

  await setStoredActiveTeamId(teamId);
  redirect("/dashboard");
}
