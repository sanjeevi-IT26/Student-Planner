const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;

export function parseTaskDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const match = DATE_PREFIX.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    return null;
  }

  // Keep date-only values on their intended local calendar day, independent of UTC.
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTaskDate(value: unknown): string {
  const date = parseTaskDate(value);
  if (!date) return "Date unavailable";

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function isTaskDueToday(value: unknown, now = new Date()): boolean {
  const date = parseTaskDate(value);
  return (
    date !== null &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isTaskDueSoon(value: unknown, now = new Date()): boolean {
  const dueDate = parseTaskDate(value);
  if (!dueDate) return false;

  dueDate.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 7);

  return dueDate >= today && dueDate <= limit;
}

export function localDateInputValue(date = new Date()): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function taskDateInputValue(value: unknown): string {
  const date = parseTaskDate(value);
  return date ? localDateInputValue(date) : "";
}
