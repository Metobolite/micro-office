import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import {
  createClient,
  getCurrentClaims,
} from "../../lib/supabaseServer";

export async function POST(req: NextRequest) {
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

  return NextResponse.redirect(new URL("/auth/login", req.url), {
    status: 302,
  });
}
