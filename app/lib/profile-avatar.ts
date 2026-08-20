type ProfileMetadata = Record<string, unknown> | null | undefined;

const PUBLIC_AVATAR_PATH = "/storage/v1/object/public/avatars/";
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  } catch {
    return "";
  }
})();

function normalizeHttpUrl(value: unknown) {
  if (typeof value !== "string") return "";

  const normalizedValue = value.trim();
  if (!normalizedValue) return "";

  try {
    const url = new URL(normalizedValue);

    return url.protocol === "http:" || url.protocol === "https:"
      ? normalizedValue
      : "";
  } catch {
    return "";
  }
}

export function getOwnedAvatarStoragePath(
  avatarUrl: string | null | undefined,
  userId: string,
) {
  const normalizedAvatarUrl = normalizeHttpUrl(avatarUrl);
  if (!normalizedAvatarUrl || !userId) return null;

  try {
    const url = new URL(normalizedAvatarUrl);
    if (!SUPABASE_ORIGIN || url.origin !== SUPABASE_ORIGIN) return null;

    const pathname = url.pathname;
    const markerIndex = pathname.indexOf(PUBLIC_AVATAR_PATH);

    if (markerIndex === -1) return null;

    const storagePath = decodeURIComponent(
      pathname.slice(markerIndex + PUBLIC_AVATAR_PATH.length),
    );
    const pathParts = storagePath.split("/");

    return pathParts.length === 3 &&
      pathParts[0] === userId &&
      pathParts[1] === "avatars" &&
      pathParts[2]
      ? storagePath
      : null;
  } catch {
    return null;
  }
}

export function getProfileAvatarSources(
  metadata: ProfileMetadata,
  userId: string,
) {
  const configuredCustomAvatarCandidate = normalizeHttpUrl(
    metadata?.profile_avatar_url,
  );
  const configuredCustomAvatar = getOwnedAvatarStoragePath(
    configuredCustomAvatarCandidate,
    userId,
  )
    ? configuredCustomAvatarCandidate
    : "";
  const legacyAvatar = normalizeHttpUrl(metadata?.avatar_url);
  const managedLegacyAvatar = getOwnedAvatarStoragePath(legacyAvatar, userId)
    ? legacyAvatar
    : "";
  const legacyCustomAvatar =
    metadata?.profile_avatar_migrated === true ? "" : managedLegacyAvatar;
  const customAvatarUrl = configuredCustomAvatar || legacyCustomAvatar;
  const providerAvatarUrl =
    normalizeHttpUrl(metadata?.picture) ||
    (managedLegacyAvatar ? "" : legacyAvatar);

  return {
    customAvatarUrl: customAvatarUrl || null,
    providerAvatarUrl: providerAvatarUrl || null,
  };
}

export function getResolvedProfileAvatarUrl(
  metadata: ProfileMetadata,
  userId: string,
) {
  const { customAvatarUrl, providerAvatarUrl } = getProfileAvatarSources(
    metadata,
    userId,
  );

  return customAvatarUrl || providerAvatarUrl;
}
