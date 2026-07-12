export interface Message {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  inserted_at: string;
}

export type TeamChatProps = {
  userId: string;
  userName: string;
  teamId: string;
};
