// Browser Notification API helpers for prescription dose reminders (Tier A).
// Works while the site tab is open; Web Push can come later for closed-tab delivery.

import { formatDoseTimeDisplay } from "@/lib/doseTimes";
import { todayLocal } from "@/lib/dates";

const ENABLED_KEY = "pillio.doseReminders.enabled";
const NOTIFIED_KEY = "pillio.doseReminders.notified";

export type NotifyDose = {
  medicationId: number;
  brandName: string;
  absoluteIndex: number;
  scheduledTime: string;
  urgency: "overdue" | "due_soon";
};

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getReminderPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ENABLED_KEY) === "1";
}

export function setReminderPreference(enabled: boolean): void {
  window.localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

/** Request permission (must be called from a user gesture). */
export async function requestReminderPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") {
    setReminderPreference(true);
    return "granted";
  }
  if (Notification.permission === "denied") {
    setReminderPreference(false);
    return "denied";
  }
  const result = await Notification.requestPermission();
  setReminderPreference(result === "granted");
  return result;
}

export function disableReminders(): void {
  setReminderPreference(false);
}

function doseNotifyKey(
  date: string,
  dose: Pick<NotifyDose, "medicationId" | "absoluteIndex" | "urgency">,
): string {
  return `${date}:${dose.medicationId}:${dose.absoluteIndex}:${dose.urgency}`;
}

function readNotifiedMap(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

function writeNotifiedMap(map: Record<string, number>): void {
  const today = todayLocal();
  const pruned: Record<string, number> = {};
  for (const [key, at] of Object.entries(map)) {
    if (key.startsWith(`${today}:`)) pruned[key] = at;
  }
  window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(pruned));
}

/**
 * Fire OS notifications for newly attention-worthy doses.
 * Dedupes per date + med + slot + urgency so polling does not spam.
 */
export function notifyDueDoses(date: string, doses: NotifyDose[]): void {
  if (!getReminderPreference()) return;
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  if (doses.length === 0) return;

  const map = readNotifiedMap();
  let changed = false;

  for (const dose of doses) {
    const key = doseNotifyKey(date, dose);
    if (map[key]) continue;

    try {
      const title =
        dose.urgency === "overdue" ? "Pillio — dose overdue" : "Pillio — dose due soon";
      const notification = new Notification(title, {
        body: `${formatDoseTimeDisplay(dose.scheduledTime)} · ${dose.brandName} (reminder only)`,
        tag: key,
        renotify: false,
      });
      notification.onclick = () => {
        window.focus();
        window.location.href = "/calendar";
        notification.close();
      };
      map[key] = Date.now();
      changed = true;
    } catch {
      // Some browsers throw if permission flipped mid-session.
    }
  }

  if (changed) writeNotifiedMap(map);
}

/** Optional smoke-test toast after enabling. */
export function sendTestNotification(): boolean {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  try {
    new Notification("Pillio reminders on", {
      body: "You’ll get a desktop alert when a prescription dose is due or overdue.",
      tag: "pillio-test",
    });
    return true;
  } catch {
    return false;
  }
}
