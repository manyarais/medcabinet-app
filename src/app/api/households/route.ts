// GET /api/households — list active memberships
// POST /api/households — set active household { householdId }

import {
  ACTIVE_HOUSEHOLD_COOKIE,
  listMemberships,
  setActiveHouseholdId,
} from "@/lib/household";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const memberships = await listMemberships();
    const jar = await cookies();
    const preferred = jar.get(ACTIVE_HOUSEHOLD_COOKIE)?.value;
    const activeHouseholdId =
      (preferred && memberships.some((m) => m.householdId === preferred)
        ? preferred
        : null) ??
      memberships[0]?.householdId ??
      null;
    return NextResponse.json({ memberships, activeHouseholdId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Could not list households." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { householdId?: string };
    const householdId = body.householdId?.trim();
    if (!householdId) {
      return NextResponse.json({ error: "householdId is required." }, { status: 400 });
    }
    await setActiveHouseholdId(householdId);
    return NextResponse.json({ ok: true, householdId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Could not switch household." }, { status: 500 });
  }
}
