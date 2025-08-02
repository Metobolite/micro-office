export type EventType = {
  id: number;
  title: string;
  description?: string;
  type: "meeting" | "review" | "presentation" | "planning";
  date: string;
  time?: string;
  duration?: string;
  attendees?: { name: string; avatar?: string }[];
};