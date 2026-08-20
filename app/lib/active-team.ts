import "server-only";

import {
  ACTIVE_TEAM_COOKIE,
  ACTIVE_TEAM_COOKIE_OPTIONS,
  isValidTeamId,
} from "@/app/lib/team-cookie";
import { cookies } from "next/headers";

export async function getStoredActiveTeamId() {
  const value = (await cookies()).get(ACTIVE_TEAM_COOKIE)?.value;
  return isValidTeamId(value) ? value : null;
}

export async function setStoredActiveTeamId(teamId: string) {
  if (!isValidTeamId(teamId)) {
    throw new Error("Invalid active team identifier.");
  }

  (await cookies()).set(
    ACTIVE_TEAM_COOKIE,
    teamId,
    ACTIVE_TEAM_COOKIE_OPTIONS,
  );
}
