export type TeamPresenceStatus = "online" | "away" | "offline";

export type TeamPresenceConnection =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

export type TeamPresenceProfile = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

export type TeamPresencePayload = {
  status: Exclude<TeamPresenceStatus, "offline">;
  last_active_at: string;
};

export type TeamMemberPresenceCard = {
  teamId: string;
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  role: string | null;
  email: string;
  phone: string;
  joinedLabel: string;
};
