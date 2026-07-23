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

export type CalendarScopeProps = {
  teamId: string;
  userId: string;
};

export type CalendarProps = CalendarScopeProps & {
  initialEvents: EventType[];
};

export type AddEventModalProps = CalendarScopeProps & {
  onEventAdded: () => void;
};

export type EditEventModalProps = CalendarScopeProps & {
  event: EventType;
  onEventUpdated: () => void;
};

export type DeleteEventModalProps = {
  userId: string;
  eventId: string;
  onDeleted: () => void;
};
