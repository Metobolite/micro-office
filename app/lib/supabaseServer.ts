import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
});

/**
 * `layout.tsx` and its page are rendered in the same request, so keep their
 * verified auth lookup on one shared promise instead of calling Supabase Auth
 * once for every segment.
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { user, error };
});

export const getCurrentClaims = cache(async function getCurrentClaims() {
  const supabase = await createClient();
  return supabase.auth.getClaims();
});

type CurrentIdentity = Pick<User, "id" | "email" | "user_metadata">;

/**
 * Most routes only need the stable identity fields that are already present in
 * the signed access-token claims. With asymmetric signing this avoids an Auth
 * API round trip; symmetric projects safely fall back to Supabase verification.
 */
export const getCurrentIdentity = cache(async function getCurrentIdentity() {
  const { data, error } = await getCurrentClaims();
  const claims = data?.claims;
  const user: CurrentIdentity | null = claims
    ? {
        id: claims.sub,
        email: claims.email,
        user_metadata: claims.user_metadata ?? {},
      }
    : null;

  return { user, error };
});
