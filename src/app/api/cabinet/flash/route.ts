// POST /api/cabinet/flash — blink a compartment's strip so the user can find
// it (medication locator). The strip blinks until its switch is pressed.

import { logActivity } from "@/lib/activity";
import { flashCompartment } from "@/lib/cabinetBoard";
import { isValidAssignableCompartment } from "@/lib/compartments";
import { getHousehold } from "@/lib/household";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const household = await getHousehold();
  let compartment: number;
  try {
    const body = (await request.json()) as { compartment?: number };
    compartment = Number(body.compartment);
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  if (!isValidAssignableCompartment(compartment)) {
    return NextResponse.json({ error: "Invalid compartment." }, { status: 400 });
  }

  const ok = await flashCompartment(compartment);
  if (ok) {
    void logActivity(household.id, "flash", { compartment, detail: "locate" });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(
    { error: "Cabinet board not reachable — is it powered on and on WiFi?" },
    { status: 502 },
  );
}
