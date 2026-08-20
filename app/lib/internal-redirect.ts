const DEFAULT_INTERNAL_REDIRECT = "/teams";
const INTERNAL_REDIRECT_BASE = new URL("https://internal.invalid");
const INVITATION_PATH_PATTERN = /^\/invite\/[0-9a-f]{64}$/i;
const ENCODED_PATH_SEPARATOR_PATTERN = /%(?:2f|5c)/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function isAllowedPathname(pathname: string) {
  return (
    pathname === "/teams" ||
    pathname.startsWith("/teams/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    INVITATION_PATH_PATTERN.test(pathname)
  );
}

/**
 * Canonicalizes an application redirect while rejecting browser URL parser
 * edge cases such as backslash network paths and encoded path separators.
 */
export function getSafeInternalRedirect(
  value: unknown,
  fallback = DEFAULT_INTERNAL_REDIRECT,
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    typeof candidate !== "string" ||
    candidate.length === 0 ||
    candidate.length > 2_048 ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(candidate) ||
    ENCODED_PATH_SEPARATOR_PATTERN.test(candidate)
  ) {
    return fallback;
  }

  try {
    const target = new URL(candidate, INTERNAL_REDIRECT_BASE);

    if (
      target.origin !== INTERNAL_REDIRECT_BASE.origin ||
      !isAllowedPathname(target.pathname)
    ) {
      return fallback;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
