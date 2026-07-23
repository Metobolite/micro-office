import "server-only";

import { cache } from "react";
import { createClient } from "@/app/lib/supabaseServer";
import type {
  TeamContext,
  TeamMembershipRecord,
  TeamSearchParams,
} from "@/app/types/team";

export function getTeamIdFromSearchParams(searchParams?: TeamSearchParams) {
  const teamId = searchParams?.teamId;

  if (Array.isArray(teamId)) {
    return teamId[0] ?? null;
  }

  return teamId ?? null;
}

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

export async function getTeamContext(
  userId: string,
  requestedTeamId?: string | null,
): Promise<TeamContext> {
  const { memberships } = await loadTeamMemberships(userId);
  const teamIds = Array.from(
    new Set(memberships.map((membership) => membership.team_id)),
  );
  const requestedTeamBelongsToUser =
    requestedTeamId != null && teamIds.includes(requestedTeamId);
  const activeTeamId =
    requestedTeamBelongsToUser && requestedTeamId
      ? requestedTeamId
      : teamIds[0] ?? null;

  return {
    memberships,
    teamIds,
    activeTeamId,
    isRequestedTeamIdValid: requestedTeamBelongsToUser,
  };
}
