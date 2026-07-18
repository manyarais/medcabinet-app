// GET/PATCH /api/reminders/settings — call message, quiet hours, server auto-call.

import { isValidDoseTime, normalizeDoseTime } from "@/lib/doseTimes";
import {
  DEFAULT_CALL_TEMPLATE,
  getReminderSettings,
  type ReminderSettingsDto,
} from "@/lib/reminderSettings";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const settings = await getReminderSettings();
  return NextResponse.json({ settings });
}

type PatchBody = Partial<ReminderSettingsDto>;

export async function PATCH(request: NextRequest) {
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const current = await getReminderSettings();
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

  await prisma.reminderSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });

  return NextResponse.json({ settings: await getReminderSettings() });
}
