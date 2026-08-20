export const TIME_STEP_MINUTES = 30;

const padTimePart = (value: number) => String(value).padStart(2, "0");

export const getLocalDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = padTimePart(date.getMonth() + 1);
  const day = padTimePart(date.getDate());

  return `${year}-${month}-${day}`;
};

export const formatTimeValue = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${padTimePart(hours)}:${padTimePart(minutes)}`;
};

export const TIME_OPTIONS = Array.from(
  { length: (24 * 60) / TIME_STEP_MINUTES },
  (_, index) => formatTimeValue(index * TIME_STEP_MINUTES),
);

export const getLocalDateTimeParts = (value?: string | null) => {
  if (!value) return { date: "", time: "" };

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return { date: "", time: "" };
  }

  const year = parsedDate.getFullYear();
  const month = padTimePart(parsedDate.getMonth() + 1);
  const day = padTimePart(parsedDate.getDate());
  const hours = padTimePart(parsedDate.getHours());
  const minutes = padTimePart(parsedDate.getMinutes());

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
};

export const localDateTimeToISOString = (date: string, time: string) => {
  if (!date) return null;

  return new Date(`${date}T${time || "00:00"}:00`).toISOString();
};
