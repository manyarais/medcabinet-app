// POST /api/expiry/dispose — mark a medication as disposed. Keeps the record
// for the audit trail but frees its compartment and removes it from active
// search and the cabinet grid.

import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/household";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { household } = await requireCapability("mutateMeds");
  let id: number;
  try {
    const body = (await request.json()) as { id?: number };
    id = Number(body.id);
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid medication id." }, { status: 400 });
  }

  const existing = await prisma.medication.findUnique({ where: { id } });
  if (!existing || existing.householdId !== household.id) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  const freedCompartment = existing.compartment;
  const medication = await prisma.medication.update({
    where: { id },
    data: {
      status: "disposed",
      disposedAt: new Date(),
      compartment: null,
      compartmentSize: null,
      outOfCabinet: false,
      outSince: null,
    },
  });

  void logActivity(household.id, "disposed", {
    medicationId: id,
    compartment: freedCompartment,
    detail: medication.brandName,
  });

  return NextResponse.json({ medication });
}
