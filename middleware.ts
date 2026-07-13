import { updateSession } from "./app/lib/middleware";
import type { MiddlewareConfig, NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
} satisfies MiddlewareConfig & { runtime: "nodejs" };
