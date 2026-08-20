"use server";

import { getOwnedAvatarStoragePath } from "@/app/lib/profile-avatar";
import {
  createClient,
  getCurrentIdentity,
} from "@/app/lib/supabaseServer";
import type {
  ProfileSettingsInput,
  SettingsActionResult,
  WorkspaceSettingsInput,
} from "@/app/types/settings";
import { revalidatePath } from "next/cache";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isProfileSettingsInput(input: unknown): input is ProfileSettingsInput {
  if (!input || typeof input !== "object") return false;

  const value = input as Record<string, unknown>;
  return (
    typeof value.fullName === "string" &&
    typeof value.phone === "string" &&
    typeof value.customAvatarUrl === "string"
  );
}

function isWorkspaceSettingsInput(
  input: unknown,
): input is WorkspaceSettingsInput {
  if (!input || typeof input !== "object") return false;

  const value = input as Record<string, unknown>;
  return (
    typeof value.teamId === "string" && typeof value.teamName === "string"
  );
}

function isValidAvatarUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function updateProfileSettings(
  input: unknown,
): Promise<SettingsActionResult> {
  if (!isProfileSettingsInput(input)) {
    return { success: false, message: "Profile information is invalid." };
  }

  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const phone = input.phone.trim();
  const customAvatarUrl = input.customAvatarUrl.trim();

  if (fullName.length < 2 || fullName.length > 80) {
    return {
      success: false,
      message: "Name must be between 2 and 80 characters.",
    };
  }

  if (phone.length > 30) {
    return {
      success: false,
      message: "Phone number cannot be longer than 30 characters.",
    };
  }

  if (customAvatarUrl.length > 500 || !isValidAvatarUrl(customAvatarUrl)) {
    return {
      success: false,
      message: "Enter a valid http or https image URL.",
    };
  }

  const supabase = await createClient();
  const { user } = await getCurrentIdentity();

  if (!user) {
    return { success: false, message: "You must sign in again to continue." };
  }

  if (
    customAvatarUrl &&
    !getOwnedAvatarStoragePath(customAvatarUrl, user.id)
  ) {
    return {
      success: false,
      message: "Choose a profile photo uploaded from your account.",
    };
  }

  const legacyAvatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url.trim()
      : "";
  const legacyAvatarIsCustom = Boolean(
    getOwnedAvatarStoragePath(legacyAvatarUrl, user.id),
  );

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      name: fullName,
      phone,
      profile_avatar_url: customAvatarUrl || null,
      profile_avatar_migrated: true,
      ...(legacyAvatarIsCustom ? { avatar_url: null } : {}),
    },
  });

  if (authError) {
    console.error("Profile auth update error:", authError);
    return {
      success: false,
      message: "Profile could not be updated. Please try again.",
    };
  }

  const { error: rpcError } = await supabase.rpc("sync_own_profile_settings");

  if (rpcError) {
    console.error("Profile membership sync error:", rpcError);
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/settings");

  if (rpcError) {
    return {
      success: true,
      warning: true,
      message:
        "Profile saved to your account, but team cards could not be synchronized.",
    };
  }

  return { success: true, message: "Profile settings saved." };
}

export async function updateWorkspaceSettings(
  input: unknown,
): Promise<SettingsActionResult> {
  if (!isWorkspaceSettingsInput(input)) {
    return { success: false, message: "Workspace information is invalid." };
  }

  const teamId = input.teamId.trim();
  const teamName = input.teamName.trim().replace(/\s+/g, " ");

  if (!teamId || !UUID_PATTERN.test(teamId)) {
    return { success: false, message: "Team information is missing." };
  }

  if (teamName.length < 2 || teamName.length > 80) {
    return {
      success: false,
      message: "Workspace name must be between 2 and 80 characters.",
    };
  }

  const supabase = await createClient();
  const { user } = await getCurrentIdentity();

  if (!user) {
    return { success: false, message: "You must sign in again to continue." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (membershipError) {
    console.error("Workspace permission check error:", membershipError);
    return {
      success: false,
      message: "Workspace permissions could not be verified. Please try again.",
    };
  }

  if (!membership) {
    return {
      success: false,
      message: "Only workspace owners and admins can change this name.",
    };
  }

  const { error: rpcError } = await supabase.rpc(
    "update_team_name_settings",
    {
      new_team_name: teamName,
      target_team_id: teamId,
    },
  );

  if (rpcError) {
    console.error("Workspace settings update error:", rpcError);
    return {
      success: false,
      message: "Workspace could not be updated. Please try again.",
    };
  }

  revalidatePath("/teams");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");

  return { success: true, message: "Workspace settings saved." };
}
