export type ProfileSettings = {
  fullName: string;
  email: string;
  phone: string;
  customAvatarUrl: string;
  providerAvatarUrl: string;
  createdAt: string;
};

export type WorkspaceSettings = {
  id: string;
  name: string;
  role: string;
  canManage: boolean;
};

export type SettingsClientProps = {
  profile: ProfileSettings;
  workspace: WorkspaceSettings;
};

export type ProfileSettingsInput = Pick<
  ProfileSettings,
  "fullName" | "phone" | "customAvatarUrl"
>;

export type WorkspaceSettingsInput = {
  teamId: string;
  teamName: string;
};

export type SettingsActionResult = {
  success: boolean;
  message: string;
  warning?: boolean;
};
