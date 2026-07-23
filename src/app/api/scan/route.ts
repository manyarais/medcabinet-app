// POST /api/scan — Phase 4 hardware intake endpoint (PRD section 6).
// Accepts structured label data from scanner hardware, normalizes the name
// via RxNorm → openFDA, and saves a pending-review Medication.
// Extension to the PRD contract: optional "personName" files the medication
// under that person's library (read off prescription labels).
// Deviation from the PRD: an unrecognized name is still SAVED (productType
// UNKNOWN) rather than 404'd, so a bad lookup never loses a physical scan.

import { logActivity } from "@/lib/activity";
import { resetAllLights } from "@/lib/cabinetBoard";
import { intakeScan } from "@/lib/scanner";
import { prisma } from "@/lib/db";
import { resolveScanHousehold } from "@/lib/household";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/scan — the Clear button: wipe EVERYTHING (all medications,
// schedules, history) and reset every cabinet strip back to red/empty, so the
// app and the physical cabinet both start from a blank slate.
export async function DELETE(request: NextRequest) {
  const household = await resolveScanHousehold(request, "manageSettings");
  await prisma.reminderCallLog.deleteMany({ where: { householdId: household.id } });
  await prisma.usageLog.deleteMany({ where: { householdId: household.id } });
  await prisma.prescription.deleteMany({ where: { householdId: household.id } });
  const result = await prisma.medication.deleteMany({ where: { householdId: household.id } });
  void resetAllLights();
  void logActivity(household.id, "demo_reset", { detail: `cleared ${result.count} medications` });
  return NextResponse.json({ deleted: result.count });
}

type ScanBody = {
  name?: string;
  genericName?: string | null;
  expirationDate?: string | null;
  dosageStrength?: string | null;
  rawLabelText?: string | null;
  personName?: string | null;
  bottleSize?: string | null; // accepted but unused until compartment-fit lands
};

export async function POST(request: NextRequest) {
  const household = await resolveScanHousehold(request);
  let body: ScanBody;
  try {
    body = (await request.json()) as ScanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  try {
    const result = await intakeScan(household.id, {
      name,
      genericName: body.genericName,
      dosageStrength: body.dosageStrength,
      expirationDate: body.expirationDate,
      personName: body.personName,
      rawLabelText: body.rawLabelText,
    });
    return NextResponse.json(
      {
        medication: result.medication,
        matched: result.matched,
        updatedExisting: result.updatedExisting,
      },
      { status: result.updatedExisting ? 200 : 201 },
    );
  } catch (error) {
    console.error("Scan intake failed:", error);
    return NextResponse.json(
      { error: "Could not save the scanned medication." },
      { status: 500 },
    );
  }
}
