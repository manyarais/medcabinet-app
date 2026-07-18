// Client-side preference + dedupe for Twilio auto-calls on overdue doses.

const AUTO_KEY = "pillio.callReminders.enabled";
const CALLED_KEY = "pillio.callReminders.called";

export function isCallAutoEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTO_KEY) === "1";
}

export function setCallAutoEnabled(on: boolean): void {
  window.localStorage.setItem(AUTO_KEY, on ? "1" : "0");
}

/** Deduped auto-call for one overdue dose (used while the site tab is open). */
export async function maybeAutoCallDose(opts: {
  date: string;
  medicationId: number;
  absoluteIndex: number;
  urgency: "overdue" | "due_soon";
  brandName: string;
  scheduledTime: string;
}): Promise<void> {
  if (!isCallAutoEnabled()) return;
  if (opts.urgency !== "overdue") return;

  const key = `${opts.date}:${opts.medicationId}:${opts.absoluteIndex}`;
  try {
    const raw = window.localStorage.getItem(CALLED_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    if (map[key]) return;

    const response = await fetch("/api/reminders/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: opts.brandName,
        scheduledTime: opts.scheduledTime,
      }),
    });
    if (!response.ok) return;

    const pruned: Record<string, number> = {};
    for (const [k, at] of Object.entries(map)) {
      if (k.startsWith(`${opts.date}:`)) pruned[k] = at;
    }
    pruned[key] = Date.now();
    window.localStorage.setItem(CALLED_KEY, JSON.stringify(pruned));
  } catch {
    // Best-effort.
  }
}
