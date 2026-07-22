// GET/PATCH /api/reminders/settings — call message, quiet hours, server auto-call, phone.

import { isValidDoseTime, normalizeDoseTime } from "@/lib/doseTimes";
import {
  DEFAULT_CALL_TEMPLATE,
  getReminderSettings,
  isValidReminderPhone,
  normalizeReminderPhone,
  type ReminderSettingsDto,
} from "@/lib/reminderSettings";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/household";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { household } = await requireCapability("manageSettings");
  const settings = await getReminderSettings(household.id);
  return NextResponse.json({ settings });
}

type PatchBody = Partial<ReminderSettingsDto>;

export async function PATCH(request: NextRequest) {
  const { household } = await requireCapability("manageSettings");
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const current = await getReminderSettings(household.id);
  const data: ReminderSettingsDto = { ...current };

  if (body.serverAutoCall !== undefined) {
    data.serverAutoCall = Boolean(body.serverAutoCall);
  }

  if (body.callMessageTemplate !== undefined) {
    const t = body.callMessageTemplate.trim();
    data.callMessageTemplate = t || DEFAULT_CALL_TEMPLATE;
    if (data.callMessageTemplate.length > 800) {
      return NextResponse.json(
        { error: "callMessageTemplate must be 800 characters or fewer." },
        { status: 400 },
      );
    }
  }

  if (body.quietHoursEnabled !== undefined) {
    data.quietHoursEnabled = Boolean(body.quietHoursEnabled);
  }

  if (body.quietStart !== undefined) {
    if (!isValidDoseTime(body.quietStart)) {
      return NextResponse.json({ error: "quietStart must be HH:MM." }, { status: 400 });
    }
    data.quietStart = normalizeDoseTime(body.quietStart);
  }

  if (body.quietEnd !== undefined) {
    if (!isValidDoseTime(body.quietEnd)) {
      return NextResponse.json({ error: "quietEnd must be HH:MM." }, { status: 400 });
    }
    data.quietEnd = normalizeDoseTime(body.quietEnd);
  }

  if (body.callOverdueDuringQuiet !== undefined) {
    data.callOverdueDuringQuiet = Boolean(body.callOverdueDuringQuiet);
  }

  if (body.reminderPhone !== undefined) {
    const raw = body.reminderPhone?.trim() ?? "";
    if (!isValidReminderPhone(raw)) {
      return NextResponse.json(
        {
          error:
            "reminderPhone must be a valid phone (e.g. +15551234567 or 5551234567).",
        },
        { status: 400 },
      );
    }
    data.reminderPhone = normalizeReminderPhone(raw);
  }

  await prisma.reminderSettings.upsert({
    where: { householdId: household.id },
    create: {
      householdId: household.id,
      serverAutoCall: data.serverAutoCall,
      callMessageTemplate: data.callMessageTemplate,
      quietHoursEnabled: data.quietHoursEnabled,
      quietStart: data.quietStart,
      quietEnd: data.quietEnd,
      callOverdueDuringQuiet: data.callOverdueDuringQuiet,
      reminderPhone: data.reminderPhone,
    },
    update: {
      serverAutoCall: data.serverAutoCall,
      callMessageTemplate: data.callMessageTemplate,
      quietHoursEnabled: data.quietHoursEnabled,
      quietStart: data.quietStart,
      quietEnd: data.quietEnd,
      callOverdueDuringQuiet: data.callOverdueDuringQuiet,
      reminderPhone: data.reminderPhone,
    },
  });

  return NextResponse.json({ settings: await getReminderSettings(household.id) });
}
