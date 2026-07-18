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

export function formatMonthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** Sunday-start month grid cells (null = padding outside the month). */
export function buildMonthGrid(
  year: number,
  monthIndex: number,
): Array<string | null> {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = first.getDay(); // 0 = Sunday
  const cells: Array<string | null> = [];

  for (let i = 0; i < startPad; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(formatDateLocal(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; monthIndex: number } {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function parseYearMonth(dateStr: string): { year: number; monthIndex: number } {
  const [y, m] = dateStr.split("-").map(Number);
  return { year: y, monthIndex: m - 1 };
}
