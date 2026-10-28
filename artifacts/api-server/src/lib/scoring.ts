const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateCompletionPoints(dueDate: string, completedAt: Date): number {
  const dueDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  if (!dueDateMatch) throw new Error("Task due date must be YYYY-MM-DD.");

  const year = Number(dueDateMatch[1]);
  const month = Number(dueDateMatch[2]);
  const day = Number(dueDateMatch[3]);
  const dueDay = Date.UTC(year, month - 1, day);
  const timeZone = process.env.CAMPUS_TRACK_TIME_ZONE || "Asia/Kolkata";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(completedAt);
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const completedDay = Date.UTC(
    Number(dateParts.year),
    Number(dateParts.month) - 1,
    Number(dateParts.day),
  );
  const daysLate = Math.floor((completedDay - dueDay) / DAY_MS);

  if (daysLate < 0) return 20;
  if (daysLate === 0) return 10;
  if (daysLate === 1) return 0;
  if (daysLate <= 4) return -5;
  return -10;
}
