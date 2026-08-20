import type { TeamPresenceProfile } from "@/app/types/presence";

export interface Message {
  id: string;
  team_id: string;
  content: string;
  user_id: string;
  user_name: string;
  inserted_at: string;
}

export type TeamChatProps = {
  userId: string;
  userName: string;
  teamId: string;
  members: TeamPresenceProfile[];
  membersLoaded: boolean;
  initialMessages: Message[];
  initialMessagesLoaded: boolean;
  initialMessagesRequestedAt: string;
};
