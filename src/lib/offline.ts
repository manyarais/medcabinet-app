/** Client offline helpers — read-only resilience, no write queue. */

export const LAST_SYNC_STORAGE_KEY = "pillio-last-sync";

export function readLastSyncMs(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeLastSyncMs(at: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_SYNC_STORAGE_KEY, String(at));
  } catch {
    // ignore quota / private mode
  }
}

/** e.g. "Jul 20, 9:31 PM" */
export function formatLastSyncLabel(ms: number | null): string {
  if (ms == null) return "your last visit";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}

export const RECONNECT_TO_CHANGE = "Reconnect to make changes.";
