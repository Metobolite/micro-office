export const ACTIVE_TEAM_COOKIE = "micro-office-active-team";
export const TEAM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ACTIVE_TEAM_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export function isValidTeamId(value: unknown): value is string {
  return typeof value === "string" && TEAM_ID_PATTERN.test(value);
}
