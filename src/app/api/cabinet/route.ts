// GET /api/cabinet — list medications currently in the cabinet.
// POST /api/cabinet — add a medication to an assignable compartment.

import {
  getOccupiedCompartments,
  validateAssignableCompartment,
} from "@/lib/cabinet";
import { prisma } from "@/lib/db";
import { ensureRxCalendarSchedule } from "@/lib/rxScheduleFromLabel";
import { getHousehold } from "@/lib/household";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const household = await getHousehold();
  const medications = await prisma.medication.findMany({
    where: { householdId: household.id },
    orderBy: [{ compartment: "asc" }, { brandName: "asc" }],
  });
  return NextResponse.json({ medications });
}

type AddBody = {
  brandName?: string;
  genericName?: string | null;
  productType?: string;
  indications?: string;
  purpose?: string | null;
  warnings?: string | null;
  dosage?: string | null;
  expirationDate?: string | null;
  compartment?: number;
};

export async function POST(request: NextRequest) {
  const household = await getHousehold();
  let body: AddBody;

  try {
    body = (await request.json()) as AddBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const brandName = body.brandName?.trim();
  if (!brandName) {
    return NextResponse.json({ error: "brandName is required." }, { status: 400 });
  }

  const compartment = Number(body.compartment);
  if (!Number.isFinite(compartment)) {
    return NextResponse.json({ error: "compartment is required." }, { status: 400 });
  }

  const occupied = await getOccupiedCompartments(household.id);
  const check = validateAssignableCompartment(compartment, occupied);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  // Avoid duplicate cabinet rows for the same brand (case-insensitive).
  const existing = await prisma.medication.findMany({ where: { householdId: household.id } });
  const duplicate = existing.find(
    (med) => med.brandName.toLowerCase() === brandName.toLowerCase(),
  );
  if (duplicate) {
    return NextResponse.json(
      {
        error: `${duplicate.brandName} is already in the cabinet (compartment ${duplicate.compartment ?? "unassigned"}). Edit it instead of adding again.`,
      },
      { status: 409 },
    );
  }

  try {
    const medication = await prisma.medication.create({
      data: {
        householdId: household.id,
        brandName,
        genericName: body.genericName?.trim() || null,
        productType: body.productType?.trim() || "UNKNOWN",
        indications: body.indications?.trim() || "",
        purpose: body.purpose?.trim() || null,
        warnings: body.warnings?.trim() || null,
        dosage: body.dosage?.trim() || null,
        expirationDate: body.expirationDate?.trim() || null,
        compartment,
        compartmentSize: check.compartmentSize,
        status: "active",
      },
    });

    await ensureRxCalendarSchedule(household.id, medication.id);

    return NextResponse.json({ medication }, { status: 201 });
  } catch (error) {
    console.error("Failed to add medication to cabinet:", error);
    return NextResponse.json(
      { error: "Could not save medication to the cabinet." },
      { status: 500 },
    );
  }
}
