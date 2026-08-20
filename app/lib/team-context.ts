import "server-only";

import { cache } from "react";
import { getStoredActiveTeamId } from "@/app/lib/active-team";
import { createClient } from "@/app/lib/supabaseServer";
import type {
  TeamContext,
  TeamMembershipRecord,
} from "@/app/types/team";

const loadTeamMemberships = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select(
      "team_id, role, status, joined_at, name, email, phone, avatar_url, teams(id, name)",
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .order("team_id", { ascending: true });

  return {
    memberships: (data ?? []) as TeamMembershipRecord[],
    error,
  };
});

export function getTeamMemberships(userId: string) {
  return loadTeamMemberships(userId);
}

export function getMembershipTeam(membership?: TeamMembershipRecord | null) {
  const relatedTeams = membership?.teams;

  return Array.isArray(relatedTeams)
    ? relatedTeams[0] ?? null
    : relatedTeams ?? null;
}

export async function getTeamContext(userId: string): Promise<TeamContext> {
  const [{ memberships }, storedTeamId] = await Promise.all([
    loadTeamMemberships(userId),
    getStoredActiveTeamId(),
  ]);
  const teamIds = Array.from(
    new Set(memberships.map((membership) => membership.team_id)),
  );
  const storedTeamBelongsToUser =
    storedTeamId != null && teamIds.includes(storedTeamId);
  const activeTeamId =
    storedTeamBelongsToUser && storedTeamId ? storedTeamId : teamIds[0] ?? null;

  return {
    memberships,
    teamIds,
    activeTeamId,
  };
}
