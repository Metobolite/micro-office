import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { ACTIVE_TEAM_COOKIE } from "@/app/lib/team-cookie";
import {
  createClient,
  getCurrentClaims,
} from "../../lib/supabaseServer";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");

  if (
    (origin && origin !== req.nextUrl.origin) ||
    (!origin && fetchSite === "cross-site")
  ) {
    return NextResponse.json(
      { error: "Cross-site logout requests are not allowed." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await getCurrentClaims();

  if (error) {
    console.error("Error while fetching user:", error.message);
  }

  if (data?.claims) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Error while signing out:", signOutError.message);
    }
  }

  revalidatePath("/", "layout");

  const response = NextResponse.redirect(new URL("/auth/login", req.url), {
    status: 302,
  });
  response.headers.set("Location", "/auth/login");
  response.headers.set("Cache-Control", "no-store");
  response.cookies.delete(ACTIVE_TEAM_COOKIE);

  return response;
}
