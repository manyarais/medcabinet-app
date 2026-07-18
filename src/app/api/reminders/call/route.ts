// POST /api/reminders/call — place a Twilio Voice reminder (test or named dose).
// GET  /api/reminders/call — whether Twilio env is configured (no secrets).

import {
  buildReminderSayText,
  isTwilioConfigured,
  placeReminderCall,
} from "@/lib/twilioCall";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  test?: boolean;
  brandName?: string;
  scheduledTime?: string;
};

export async function GET() {
  return NextResponse.json({
    configured: isTwilioConfigured(),
    // Masked hint only — never return numbers/tokens.
    hasPhone: Boolean(process.env.REMINDER_PHONE_NUMBER?.trim()),
  });
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const test = Boolean(body.test);
  const brandName = body.brandName?.trim();
  const scheduledTime = body.scheduledTime?.trim();

  if (!test && !brandName) {
    return NextResponse.json(
      { error: "Provide test: true, or brandName for a dose reminder call." },
      { status: 400 },
    );
  }

  const sayText = await buildReminderSayText({
    test,
    brandName,
    scheduledTime,
  });

  const result = await placeReminderCall(sayText);
  if (!result.ok) {
    const status = result.status === 401 || result.status === 403 ? 502 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(
    {
      ok: true,
      callSid: result.callSid,
      // Last 4 digits only for confirmation in UI.
      toHint: result.to.slice(-4),
      // Echo what was spoken so you can verify the script.
      sayText,
    },
    { status: 201 },
  );
}
