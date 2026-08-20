import { getSafeInternalRedirect } from "@/app/lib/internal-redirect";
import { createClient } from "@/app/lib/supabaseServer";
import { type NextRequest, NextResponse } from "next/server";

function redirectWithoutCache(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), {
    status: 303,
  });
  // Keep Location relative so an untrusted reverse-proxy Host header cannot
  // turn an otherwise safe internal path into an external redirect.
  response.headers.set("Location", path);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeInternalRedirect(
    request.nextUrl.searchParams.get("next"),
  );
  const loginErrorPath = `/auth/login?error=callback&next=${encodeURIComponent(nextPath)}`;

  if (!code || code.length > 2_048) {
    return redirectWithoutCache(request, loginErrorPath);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback exchange failed:", error.message);
    return redirectWithoutCache(request, loginErrorPath);
  }

  return redirectWithoutCache(request, nextPath);
}
