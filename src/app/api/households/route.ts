// GET /api/households — list active memberships
// POST /api/households — set active household { householdId }
// PATCH /api/households — rename active household { name }

import {
  ACTIVE_HOUSEHOLD_COOKIE,
  listMemberships,
  requireCapability,
  setActiveHouseholdId,
} from "@/lib/household";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const MAX_NAME_LEN = 60;

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

export async function PATCH(request: NextRequest) {
  try {
    const { household } = await requireCapability("manageSettings");
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (name.length > MAX_NAME_LEN) {
      return NextResponse.json(
        { error: `Name must be ${MAX_NAME_LEN} characters or fewer.` },
        { status: 400 },
      );
    }

    const updated = await prisma.household.update({
      where: { id: household.id },
      data: { name },
      select: { id: true, name: true },
    });
    return NextResponse.json({ household: updated });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Could not rename household." }, { status: 500 });
  }
}
