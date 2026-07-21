// POST /api/ai/assistant/light — user-confirmed "light this compartment".
// Validates the medication really has that compartment before touching
// hardware; model output alone can never reach this.

import { logActivity } from "@/lib/activity";
import { flashCompartment } from "@/lib/cabinetBoard";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let medicationId = 0;
  try {
    const body = (await request.json()) as { medicationId?: number };
    medicationId = Number(body.medicationId);
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  if (!Number.isInteger(medicationId) || medicationId < 1) {
    return NextResponse.json({ error: "Invalid medication id." }, { status: 400 });
  }

  const med = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!med || med.status === "disposed") {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }
  if (med.compartment == null) {
    return NextResponse.json(
      { error: `${med.brandName} has no assigned compartment to light.` },
      { status: 409 },
    );
  }

  const ok = await flashCompartment(med.compartment);
  if (ok) {
    void logActivity("flash", {
      medicationId: med.id,
      compartment: med.compartment,
      detail: `assistant lit compartment ${med.compartment} for ${med.brandName}`,
    });
  }
  return NextResponse.json({
    ok,
    compartment: med.compartment,
    ...(ok ? {} : { error: "Cabinet lights board is unreachable." }),
  });
}
