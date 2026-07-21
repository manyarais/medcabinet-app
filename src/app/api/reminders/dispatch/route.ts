// POST /api/reminders/dispatch — place Twilio calls for overdue doses (server-side).
// Iterates all households; each uses its own ReminderSettings + CallLog dedup.
// Optional header: x-reminder-secret must match REMINDER_DISPATCH_SECRET when set.
// No Clerk — machine/cron auth only.

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

    const date = todayLocal();
    const households = await prisma.household.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    const called: Array<{
      householdId: string;
      medicationId: number;
      brandName: string;
      absoluteIndex: number;
      callSid: string;
    }> = [];
    const alreadyCalled: Array<{
      householdId: string;
      medicationId: number;
      brandName: string;
      absoluteIndex: number;
    }> = [];
    const skippedHouseholds: Array<{ householdId: string; reason?: string }> =
      [];
    const errors: string[] = [];
    let overdueCount = 0;
    let placedThisTick = false;

    for (const household of households) {
      const settings = await getReminderSettings(household.id);
      const gate = force
        ? { allow: true, inQuietHours: false as boolean, reason: undefined }
        : shouldPlaceCallsNow(settings);

      if (!gate.allow) {
        skippedHouseholds.push({
          householdId: household.id,
          reason: gate.reason,
        });
        continue;
      }

      const overdue = await listOverdueDosesToday(household.id);
      overdueCount += overdue.length;

      if (force && overdue.length > 0) {
        await prisma.reminderCallLog.deleteMany({
          where: {
            householdId: household.id,
            date,
            OR: overdue.map((d) => ({
              medicationId: d.medicationId,
              absoluteIndex: d.absoluteIndex,
            })),
          },
        });
      }

      for (const dose of overdue) {
        const existing = await prisma.reminderCallLog.findUnique({
          where: {
            householdId_date_medicationId_absoluteIndex: {
              householdId: household.id,
              date,
              medicationId: dose.medicationId,
              absoluteIndex: dose.absoluteIndex,
            },
          },
        });
        if (existing) {
          alreadyCalled.push({
            householdId: household.id,
            medicationId: dose.medicationId,
            brandName: dose.brandName,
            absoluteIndex: dose.absoluteIndex,
          });
          continue;
        }

        // At most one outbound call per dispatch tick (across households).
        if (placedThisTick) continue;

        const sayText = await buildReminderSayText({
          brandName: dose.brandName,
          scheduledTime: dose.scheduledTime,
          template: settings.callMessageTemplate,
        });

        const result = await placeReminderCall(sayText);
        if (!result.ok) {
          errors.push(`${household.name} / ${dose.brandName}: ${result.error}`);
          placedThisTick = true;
          break;
        }

        await prisma.reminderCallLog.create({
          data: {
            householdId: household.id,
            date,
            medicationId: dose.medicationId,
            absoluteIndex: dose.absoluteIndex,
            callSid: result.callSid,
          },
        });

        called.push({
          householdId: household.id,
          medicationId: dose.medicationId,
          brandName: dose.brandName,
          absoluteIndex: dose.absoluteIndex,
          callSid: result.callSid,
        });
        placedThisTick = true;
        break;
      }
    }

    return NextResponse.json({
      ok: true,
      skipped: called.length === 0 && skippedHouseholds.length === households.length,
      overdueCount,
      alreadyCalledCount: alreadyCalled.length,
      alreadyCalled,
      called,
      skippedHouseholds,
      errors,
      reason:
        overdueCount > 0 &&
        called.length === 0 &&
        alreadyCalled.length === overdueCount
          ? "All overdue doses were already called today. Mark them taken, or use Call again."
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed.";
    console.error("reminders/dispatch failed:", error);
    return NextResponse.json({ error: message, called: [] }, { status: 500 });
  }
}
