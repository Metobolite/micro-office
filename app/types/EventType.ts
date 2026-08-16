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

export const CALENDAR_UPCOMING_LIMIT = 30;

export type CalendarDateRange = {
  startDate: string;
  endDate: string;
};

export function toCalendarDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getCalendarGridRange(
  year: number,
  month: number,
): CalendarDateRange {
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayOffset);
  const gridEnd = new Date(year, month, 42 - mondayOffset);

  return {
    startDate: toCalendarDateKey(gridStart),
    endDate: toCalendarDateKey(gridEnd),
  };
}

export type CalendarScopeProps = {
  teamId: string;
  userId: string;
};

export type CalendarProps = CalendarScopeProps & {
  initialRangeEvents: EventType[];
  initialTodayEvents: EventType[];
  initialUpcomingEvents: EventType[];
  initialYear: number;
  initialMonth: number;
  initialTodayDate: string;
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
