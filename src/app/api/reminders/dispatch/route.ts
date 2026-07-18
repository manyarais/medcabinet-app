// POST /api/reminders/dispatch — place Twilio calls for overdue doses (server-side).
// Intended to be hit by `npm run reminders:watch` so the browser can be closed.
// Optional header: x-reminder-secret must match REMINDER_DISPATCH_SECRET when set.

import { todayLocal } from "@/lib/dates";
import { listOverdueDosesToday } from "@/lib/reminderDispatch";
import {
  getReminderSettings,
  shouldPlaceCallsNow,
} from "@/lib/reminderSettings";
import { prisma } from "@/lib/db";
import {
  buildReminderSayText,
  isTwilioConfigured,
  placeReminderCall,
} from "@/lib/twilioCall";
import { NextRequest, NextResponse } from "next/server";

function authorize(request: NextRequest): boolean {
  const expected = process.env.REMINDER_DISPATCH_SECRET?.trim();
  if (!expected) return true; // local/dev convenience
  return request.headers.get("x-reminder-secret") === expected;
}

export async function POST(request: NextRequest) {
  try {
    if (!authorize(request)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isTwilioConfigured()) {
      return NextResponse.json(
        { error: "Twilio is not configured.", called: [] },
        { status: 400 },
      );
    }

    let force = false;
    try {
      const body = (await request.json()) as { force?: boolean };
      force = Boolean(body.force);
    } catch {
      // Empty body is fine for the watcher.
    }

    const settings = await getReminderSettings();
    // Manual "Call again" bypasses the serverAutoCall off switch.
    const gate = force
      ? { allow: true, inQuietHours: false as boolean, reason: undefined }
      : shouldPlaceCallsNow(settings);
    if (!gate.allow) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: gate.reason,
        inQuietHours: gate.inQuietHours,
        called: [],
      });
    }

    const date = todayLocal();
    const overdue = await listOverdueDosesToday();

    if (force && overdue.length > 0) {
      // Allow one more round of calls for doses still overdue.
      await prisma.reminderCallLog.deleteMany({
        where: {
          date,
          OR: overdue.map((d) => ({
            medicationId: d.medicationId,
            absoluteIndex: d.absoluteIndex,
          })),
        },
      });
    }
    const called: Array<{
      medicationId: number;
      brandName: string;
      absoluteIndex: number;
      callSid: string;
    }> = [];
    const alreadyCalled: Array<{
      medicationId: number;
      brandName: string;
      absoluteIndex: number;
    }> = [];
    const errors: string[] = [];

    // At most one outbound call per tick to avoid flooding.
    for (const dose of overdue) {
      const existing = await prisma.reminderCallLog.findUnique({
        where: {
          date_medicationId_absoluteIndex: {
            date,
            medicationId: dose.medicationId,
            absoluteIndex: dose.absoluteIndex,
          },
        },
      });
      if (existing) {
        alreadyCalled.push({
          medicationId: dose.medicationId,
          brandName: dose.brandName,
          absoluteIndex: dose.absoluteIndex,
        });
        continue;
      }

      const sayText = await buildReminderSayText({
        brandName: dose.brandName,
        scheduledTime: dose.scheduledTime,
        template: settings.callMessageTemplate,
      });

      const result = await placeReminderCall(sayText);
      if (!result.ok) {
        errors.push(`${dose.brandName}: ${result.error}`);
        break;
      }

      await prisma.reminderCallLog.create({
        data: {
          date,
          medicationId: dose.medicationId,
          absoluteIndex: dose.absoluteIndex,
          callSid: result.callSid,
        },
      });

      called.push({
        medicationId: dose.medicationId,
        brandName: dose.brandName,
        absoluteIndex: dose.absoluteIndex,
        callSid: result.callSid,
      });
      break;
    }

    return NextResponse.json({
      ok: true,
      skipped: false,
      inQuietHours: gate.inQuietHours,
      overdueCount: overdue.length,
      alreadyCalledCount: alreadyCalled.length,
      alreadyCalled,
      called,
      errors,
      reason:
        overdue.length > 0 && called.length === 0 && alreadyCalled.length === overdue.length
          ? "All overdue doses were already called today. Mark them taken, or use Call again."
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed.";
    console.error("reminders/dispatch failed:", error);
    return NextResponse.json({ error: message, called: [] }, { status: 500 });
  }
}
