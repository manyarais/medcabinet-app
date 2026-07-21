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
};

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
