import { updateSession } from "./app/lib/middleware";
import {
  ACTIVE_TEAM_COOKIE,
  ACTIVE_TEAM_COOKIE_OPTIONS,
  isValidTeamId,
} from "./app/lib/team-cookie";
import {
  type MiddlewareConfig,
  type NextRequest,
  NextResponse,
} from "next/server";

export async function middleware(request: NextRequest) {
  const sessionResponse = await updateSession(request);
  const legacyTeamId = request.nextUrl.searchParams.get("teamId");

  if (
    !request.nextUrl.pathname.startsWith("/dashboard") ||
    legacyTeamId === null
  ) {
    return sessionResponse;
  }

  const cleanUrl = request.nextUrl.clone();
  cleanUrl.searchParams.delete("teamId");
  const response = NextResponse.redirect(cleanUrl);

  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  if (isValidTeamId(legacyTeamId)) {
    response.cookies.set(
      ACTIVE_TEAM_COOKIE,
      legacyTeamId,
      ACTIVE_TEAM_COOKIE_OPTIONS,
    );
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
} satisfies MiddlewareConfig & { runtime: "nodejs" };
