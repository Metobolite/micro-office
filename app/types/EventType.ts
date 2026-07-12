export type EventType = {
  id: string;
  title: string;
  description?: string;
  type: "meeting" | "review" | "presentation" | "planning";
  date: string;
  time?: string;
  duration?: string;
  attendees?: { name: string; avatar?: string }[];
};

export type CalendarProps = {
  teamId: string;
  userId: string;
};

export type AddEventModalProps = CalendarProps & {
  onEventAdded: () => void;
};

export type EditEventModalProps = CalendarProps & {
  event: EventType;
  onEventUpdated: () => void;
};

export type DeleteEventModalProps = {
  userId: string;
  eventId: string;
  onDeleted: () => void;
};
