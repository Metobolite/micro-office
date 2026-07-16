import type { SupabaseClient } from "@supabase/supabase-js";
import type {
	TeamContext,
	TeamMembershipRecord,
	TeamRecord,
	TeamSearchParams,
} from "@/app/types/team";

export function getTeamIdFromSearchParams(searchParams?: TeamSearchParams) {
	const teamId = searchParams?.teamId;

	if (Array.isArray(teamId)) {
		return teamId[0] ?? null;
	}

	return teamId ?? null;
}

export async function getTeamContext(
	supabase: SupabaseClient,
	userId: string,
	requestedTeamId?: string | null
): Promise<TeamContext> {
	const { data: memberships } = await supabase
		.from("team_members")
		.select("team_id, role, status, joined_at, user_id, name, email, phone, avatar_url")
		.eq("user_id", userId)
		.order("joined_at", { ascending: false })
		.order("team_id", { ascending: true });

	const teamIds = Array.from(
		new Set((memberships || []).map((membership) => membership.team_id))
	);

	const { data: teams } = teamIds.length
		? await supabase
				.from("teams")
				.select("id, name, owner_id")
				.in("id", teamIds)
		: { data: [] as TeamRecord[] };

	const teamsById = new Map((teams || []).map((team) => [team.id, team]));
	const isRequestedTeamIdValid =
		requestedTeamId != null ? teamsById.has(requestedTeamId) : false;
	const activeTeamId =
		isRequestedTeamIdValid && requestedTeamId
			? requestedTeamId
			: teamIds[0] ?? null;

	return {
		memberships: (memberships || []) as TeamMembershipRecord[],
		teams: (teams || []) as TeamRecord[],
		teamIds,
		activeTeamId,
		activeTeam: activeTeamId ? teamsById.get(activeTeamId) ?? null : null,
		isRequestedTeamIdValid,
	};
}
