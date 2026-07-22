// Reminder settings + quiet-hours helpers (Twilio Voice dispatcher).

import { isValidDoseTime, normalizeDoseTime, nowLocalHhMm } from "@/lib/doseTimes";
import { prisma } from "@/lib/db";

export const DEFAULT_CALL_TEMPLATE =
  "Hello from Pillio. This is a reminder that {brandName} is due at {scheduledTime}. Please check your Pillio calendar when you can. This is a reminder only, not medical advice. Goodbye.";

export type ReminderSettingsDto = {
  serverAutoCall: boolean;
  callMessageTemplate: string;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  callOverdueDuringQuiet: boolean;
  /** E.164 or empty — who gets voice reminders for this household. */
  reminderPhone: string | null;
};

/**
 * Normalize US-centric phone input to E.164 (+1…).
 * Accepts "+15551234567", "5551234567", "1-555-123-4567", etc.
 */
export function normalizeReminderPhone(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export function isValidReminderPhone(raw: string | null | undefined): boolean {
  if (raw == null || raw.trim() === "") return true; // empty = clear
  return normalizeReminderPhone(raw) != null;
}

export async function getReminderSettings(householdId: string): Promise<ReminderSettingsDto> {
  const row =
    (await prisma.reminderSettings.findUnique({ where: { householdId } })) ??
    (await prisma.reminderSettings.create({
      data: { householdId, callMessageTemplate: DEFAULT_CALL_TEMPLATE },
    }));

  return {
    serverAutoCall: row.serverAutoCall,
    callMessageTemplate: row.callMessageTemplate || DEFAULT_CALL_TEMPLATE,
    quietHoursEnabled: row.quietHoursEnabled,
    quietStart: normalizeDoseTime(row.quietStart) || "22:00",
    quietEnd: normalizeDoseTime(row.quietEnd) || "07:00",
    callOverdueDuringQuiet: row.callOverdueDuringQuiet,
    reminderPhone: row.reminderPhone?.trim() || null,
  };
}

/**
 * Quiet window may span midnight (e.g. 22:00 → 07:00).
 * Returns true when `nowHhMm` falls inside [start, end).
 */
export function isInQuietHours(
  nowHhMm: string,
  start: string,
  end: string,
): boolean {
  const n = normalizeDoseTime(nowHhMm);
  const s = normalizeDoseTime(start);
  const e = normalizeDoseTime(end);
  if (!isValidDoseTime(n) || !isValidDoseTime(s) || !isValidDoseTime(e)) {
    return false;
  }
  if (s === e) return false;
  if (s < e) {
    return n >= s && n < e;
  }
  return n >= s || n < e;
}

/** Whether the dispatcher should place calls right now. */
export function shouldPlaceCallsNow(settings: ReminderSettingsDto, now = new Date()): {
  allow: boolean;
  inQuietHours: boolean;
  reason?: string;
} {
  if (!settings.serverAutoCall) {
    return { allow: false, inQuietHours: false, reason: "Server auto-call is off." };
  }

  const nowHhMm = nowLocalHhMm(now);
  const inQuiet =
    settings.quietHoursEnabled &&
    isInQuietHours(nowHhMm, settings.quietStart, settings.quietEnd);

  if (inQuiet && !settings.callOverdueDuringQuiet) {
    return {
      allow: false,
      inQuietHours: true,
      reason: "Quiet hours are active (overdue calls also paused).",
    };
  }

  return { allow: true, inQuietHours: inQuiet };
}

export function applyCallTemplate(
  template: string,
  vars: { brandName: string; scheduledTime: string },
): string {
  const base = (template.trim() || DEFAULT_CALL_TEMPLATE)
    .replaceAll("{brandName}", vars.brandName)
    .replaceAll("{scheduledTime}", vars.scheduledTime);
  return base;
}
