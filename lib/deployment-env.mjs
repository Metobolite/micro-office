/** @param {Record<string, string | undefined>} env */
export function resolveAppUrl(env) {
  const configuredUrl = env.APP_URL?.trim() || env.NEXT_PUBLIC_APP_URL?.trim();
  const vercelHost = env.VERCEL_URL?.trim();
  const value = configuredUrl || (vercelHost ? `https://${vercelHost}` : "");

  if (!value) {
    if (env.NODE_ENV === "production") {
      throw new Error("Set APP_URL to the application's public origin before deployment.");
    }
    return "http://localhost:3000";
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("APP_URL must be an absolute HTTP(S) origin.");
  }

  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    (env.NODE_ENV === "production" && url.protocol !== "https:" && !isLocal)
  ) {
    throw new Error("APP_URL must be an HTTPS origin without credentials, a path, query, or fragment (HTTP is allowed locally).");
  }

  return url.origin;
}

/** @param {Record<string, string | undefined>} env */
export function getDeploymentErrors(env) {
  const errors = [];
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is required.");
  } else {
    try {
      const url = new URL(supabaseUrl);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error("Invalid Supabase URL");
      }
    } catch {
      errors.push("NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTP(S) URL without credentials, a query, or fragment.");
    }
  }

  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseKey) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is required (use a publishable or legacy anon key).");
  } else {
    let isSecret = supabaseKey.startsWith("sb_secret_");
    try {
      const payload = JSON.parse(Buffer.from(supabaseKey.split(".")[1] || "", "base64url").toString("utf8"));
      isSecret ||= payload.role === "service_role";
    } catch {
      // Publishable keys are not JWTs. The provider validates the actual key.
    }
    if (isSecret) errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY must not contain a secret or service-role key.");
  }

  try {
    resolveAppUrl(env);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Invalid APP_URL.");
  }

  if (env.RESEND_API_KEY?.trim() && !env.RESEND_FROM_EMAIL?.trim()) {
    errors.push("RESEND_FROM_EMAIL is required when RESEND_API_KEY is set; use a verified sender.");
  }

  return errors;
}
