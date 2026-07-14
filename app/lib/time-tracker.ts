import type { TimeEntry } from "@/app/types/time-tracker";

const clampDuration = (seconds: number) =>
  Math.max(0, Number.isFinite(seconds) ? Math.floor(seconds) : 0);

export function formatTimerDuration(seconds: number) {
  const safeSeconds = clampDuration(seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function formatTrackedDuration(seconds: number) {
  const safeSeconds = clampDuration(seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (safeSeconds > 0 && safeSeconds < 60) return "<1m";
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

export function getTimeEntryDuration(
  entry: TimeEntry,
  currentTime = Date.now(),
) {
  const savedDuration = clampDuration(entry.duration_sec ?? 0);

  if (
    entry.status !== "running" ||
    entry.end_time !== null ||
    !entry.active_started_at
  ) {
    return savedDuration;
  }

  const activeStartedAt = new Date(entry.active_started_at).getTime();
  if (!Number.isFinite(activeStartedAt)) return savedDuration;

  return clampDuration(
    savedDuration + Math.max(0, currentTime - activeStartedAt) / 1000,
  );
}

export function getStartOfToday(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getStartOfWeek(referenceDate = new Date()) {
  const start = getStartOfToday(referenceDate);
  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function isMissingTimeTrackingSchema(error: {
  code?: string;
  message?: string;
}) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    ((message.includes("time_entries") || message.includes("time_entry")) &&
      (message.includes("does not exist") || message.includes("schema cache")))
  );
}
