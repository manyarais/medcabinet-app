// Twilio Voice outbound calls for dose reminders.
// Uses inline TwiML so localhost works without a public webhook URL.

import { formatDoseTimeDisplay } from "@/lib/doseTimes";
import {
  applyCallTemplate,
  DEFAULT_CALL_TEMPLATE,
  getReminderSettings,
  normalizeReminderPhone,
} from "@/lib/reminderSettings";

export type TwilioAccountConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

export type TwilioConfig = TwilioAccountConfig & {
  toNumber: string;
};

/** SID + token + From number — enough to place calls once a To number is known. */
export function getTwilioAccountConfig(): TwilioAccountConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim() ?? "";

  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }

  return { accountSid, authToken, fromNumber };
}

export function isTwilioConfigured(): boolean {
  return getTwilioAccountConfig() != null;
}

/** Resolve To number: household setting → env fallback. */
export function resolveReminderToNumber(
  householdPhone: string | null | undefined,
): string | null {
  return (
    normalizeReminderPhone(householdPhone) ??
    normalizeReminderPhone(process.env.REMINDER_PHONE_NUMBER) ??
    null
  );
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Spoken script for a reminder call (not medical advice). */
export async function buildReminderSayText(opts: {
  /** Required when `template` is omitted (loads ReminderSettings). */
  householdId?: string;
  brandName?: string;
  scheduledTime?: string;
  test?: boolean;
  template?: string;
}): Promise<string> {
  const settings =
    opts.template || !opts.householdId
      ? null
      : await getReminderSettings(opts.householdId).catch(() => null);
  const template =
    opts.template ?? settings?.callMessageTemplate ?? DEFAULT_CALL_TEMPLATE;

  // Test calls use the saved template with sample values so you hear the real script.
  const brand =
    opts.brandName?.trim() ||
    (opts.test ? "Amoxicillin" : "your medication");
  const timeRaw =
    opts.scheduledTime?.trim() || (opts.test ? "08:00" : "");
  const time = timeRaw ? formatDoseTimeDisplay(timeRaw) : "the scheduled time";

  const spoken = applyCallTemplate(template, {
    brandName: brand,
    scheduledTime: time,
  });

  if (opts.test) {
    return `This is a Pillio test call. ${spoken}`;
  }
  return spoken;
}

export type PlaceCallResult =
  | { ok: true; callSid: string; to: string }
  | { ok: false; error: string; status?: number };

export async function placeReminderCall(
  sayText: string,
  opts?: { toNumber?: string | null },
): Promise<PlaceCallResult> {
  const account = getTwilioAccountConfig();
  if (!account) {
    return {
      ok: false,
      error:
        "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.",
    };
  }

  const toNumber = resolveReminderToNumber(opts?.toNumber);
  if (!toNumber) {
    return {
      ok: false,
      error:
        "No reminder phone set. Add one in Settings → Phone call reminders (or set REMINDER_PHONE_NUMBER).",
    };
  }

  const twiml = `<Response><Say>${escapeXml(sayText)}</Say></Response>`;
  const body = new URLSearchParams({
    To: toNumber,
    From: account.fromNumber,
    Twiml: twiml,
  });

  const auth = Buffer.from(`${account.accountSid}:${account.authToken}`).toString(
    "base64",
  );
  const url = `https://api.twilio.com/2010-04-01/Accounts/${account.accountSid}/Calls.json`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch {
    return { ok: false, error: "Could not reach Twilio." };
  }

  const json = (await response.json()) as {
    sid?: string;
    message?: string;
    error_message?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: json.message ?? json.error_message ?? "Twilio call failed.",
    };
  }

  if (!json.sid) {
    return { ok: false, error: "Twilio did not return a call SID." };
  }

  return { ok: true, callSid: json.sid, to: toNumber };
}
