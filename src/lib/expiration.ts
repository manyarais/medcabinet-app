// Expiration parsing + status. Labels print dates in many shapes (2027-06,
// 06/2027, JUN 2027, 6/30/27) — parse leniently, and treat month-only dates
// as good through the END of that month, matching pharmacy convention.

export type ExpiryStatus = "expired" | "soon" | "ok" | "unknown";

/** Days before expiry that counts as "expiring soon". */
export const SOON_DAYS = 60;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function endOfMonth(year: number, month: number): Date {
  // Day 0 of the next month = last day of this month.
  return new Date(year, month, 0, 23, 59, 59);
}

function fullYear(twoOrFour: number): number {
  return twoOrFour < 100 ? 2000 + twoOrFour : twoOrFour;
}

/** Best-effort parse of a printed expiration into its last valid moment. */
export function parseExpiration(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase().replace(/\[\?\]/g, "").trim();
  if (!text) return null;

  // 2027-06 or 2027/06 (+ optional -15 day)
  let m = text.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/);
  if (m) {
    const [, y, mo, d] = m;
    const year = Number(y), month = Number(mo);
    if (month < 1 || month > 12) return null;
    return d ? new Date(year, month - 1, Number(d), 23, 59, 59) : endOfMonth(year, month);
  }

  // 06/2027 or 6-2027
  m = text.match(/^(\d{1,2})[-/](\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    if (month < 1 || month > 12) return null;
    return endOfMonth(Number(m[2]), month);
  }

  // 6/30/27 or 06/30/2027 (US month/day/year)
  m = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    const month = Number(m[1]), day = Number(m[2]), year = fullYear(Number(m[3]));
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day, 23, 59, 59);
  }

  // "jun 2027", "june 2027", "jun-27", "exp jun 2027"
  m = text.match(/([a-z]{3,9})[ .\-/]*(\d{2,4})/);
  if (m) {
    const month = MONTHS[m[1].slice(0, 3)];
    if (month) return endOfMonth(fullYear(Number(m[2])), month);
  }

  return null;
}

export function expiryStatusFor(raw: string | null | undefined): ExpiryStatus {
  const date = parseExpiration(raw);
  if (!date) return "unknown";
  const now = new Date();
  if (date < now) return "expired";
  const soonCutoff = new Date(now.getTime() + SOON_DAYS * 24 * 60 * 60 * 1000);
  if (date <= soonCutoff) return "soon";
  return "ok";
}
