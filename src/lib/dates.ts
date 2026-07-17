// Calendar-day helpers for prescription schedules (YYYY-MM-DD, local).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayLocal(): string {
  return formatDateLocal(new Date());
}

export function addDaysLocal(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return formatDateLocal(date);
}

export function compareDateStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

export function isDateInInclusiveRange(
  day: string,
  startDate: string,
  endDate: string,
): boolean {
  return (
    compareDateStrings(day, startDate) >= 0 &&
    compareDateStrings(day, endDate) <= 0
  );
}

/** Local-midnight bounds for filtering UsageLog.takenAt on a calendar day. */
export function dayBoundsLocal(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start, end };
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
