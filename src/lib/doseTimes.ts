// Local clock times for prescription dose slots ("HH:MM", 24-hour).

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

export function isValidDoseTime(value: string): boolean {
  return TIME_RE.test(value.trim());
}

/** Normalize to HH:MM (strip optional seconds). */
export function normalizeDoseTime(value: string): string {
  const match = value.trim().match(TIME_RE);
  if (!match) return value.trim();
  return `${match[1]}:${match[2]}`;
}

/** Sensible defaults when the user picks a doses-per-day count. */
export function defaultDoseTimes(count: number): string[] {
  const presets: Record<number, string[]> = {
    1: ["08:00"],
    2: ["08:00", "20:00"],
    3: ["08:00", "14:00", "20:00"],
    4: ["08:00", "12:00", "16:00", "20:00"],
  };
  if (presets[count]) return [...presets[count]];

  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    const minutes = Math.round((8 * 60) + (i * (12 * 60)) / Math.max(count - 1, 1));
    const h = Math.min(22, Math.floor(minutes / 60));
    const m = minutes % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return times;
}

export function serializeDoseTimes(times: string[]): string {
  return JSON.stringify(times);
}

/** Parse stored JSON; pad/trim to `expectedCount` with defaults if needed. */
export function parseDoseTimes(
  raw: string | null | undefined,
  expectedCount: number,
): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw ?? "[]");
  } catch {
    return defaultDoseTimes(expectedCount);
  }

  if (!Array.isArray(parsed)) {
    return defaultDoseTimes(expectedCount);
  }

  const valid = parsed
    .map((t) => (typeof t === "string" ? normalizeDoseTime(t) : ""))
    .filter(isValidDoseTime);

  if (valid.length === expectedCount) {
    return valid;
  }

  const defaults = defaultDoseTimes(expectedCount);
  return defaults.map((fallback, i) => valid[i] ?? fallback);
}

/** Validate API/form input; returns sorted unique-enough list or an error message. */
export function normalizeDoseTimesInput(
  times: unknown,
  dosesPerDay: number,
): { ok: true; times: string[] } | { ok: false; error: string } {
  if (!Array.isArray(times)) {
    return {
      ok: false,
      error: "doseTimes must be an array of HH:MM strings matching dosesPerDay.",
    };
  }

  if (times.length !== dosesPerDay) {
    return {
      ok: false,
      error: `Provide exactly ${dosesPerDay} dose time${dosesPerDay === 1 ? "" : "s"} (HH:MM).`,
    };
  }

  const normalized: string[] = [];
  for (const raw of times) {
    if (typeof raw !== "string" || !isValidDoseTime(raw)) {
      return {
        ok: false,
        error: "Each dose time must be HH:MM in 24-hour format (e.g. 08:00).",
      };
    }
    normalized.push(normalizeDoseTime(raw));
  }

  return { ok: true, times: normalized };
}

/** Display "8:00 AM" from "08:00". */
export function formatDoseTimeDisplay(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const date = new Date(2000, 0, 1, h, m);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Current local clock as HH:MM. */
export function nowLocalHhMm(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Minutes from `now` until scheduled HH:MM (negative = already past). */
export function minutesUntilDose(
  scheduledTime: string,
  now: Date = new Date(),
): number {
  const normalized = normalizeDoseTime(scheduledTime);
  const [hStr, mStr] = normalized.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.POSITIVE_INFINITY;

  const scheduled = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    0,
    0,
  );
  return Math.round((scheduled.getTime() - now.getTime()) / 60_000);
}

export type DoseUrgency = "taken" | "upcoming" | "due_soon" | "overdue";

/** Classify a today's dose relative to the local clock. */
export function doseUrgency(
  scheduledTime: string,
  taken: boolean,
  now: Date = new Date(),
  dueSoonMinutes = 30,
): DoseUrgency {
  if (taken) return "taken";
  const mins = minutesUntilDose(scheduledTime, now);
  if (mins <= 0) return "overdue";
  if (mins <= dueSoonMinutes) return "due_soon";
  return "upcoming";
}
