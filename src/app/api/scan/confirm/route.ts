// POST /api/scan/confirm — user reviewed a pending scan: apply their edits,
// then either assign the next free compartment (and flash its light) or save
// it to the library without a compartment.
// Body: { id, assign, fields?: { brandName?, genericName?, dosage?, form?,
//         expirationDate?, personName?, prescriber?, pharmacy?, rxNumber?, refills? } }

import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { nextFreeCompartment, notifyScanDone } from "@/lib/scanner";
import { sizeForCompartment } from "@/lib/compartments";
import { ensureRxCalendarSchedule } from "@/lib/rxScheduleFromLabel";
import { getHouseholdByScanToken, scanTokenFromRequest } from "@/lib/household";
import { NextRequest, NextResponse } from "next/server";

const EDITABLE_FIELDS = [
  "brandName",
  "genericName",
  "dosage",
  "form",
  "expirationDate",
  "personName",
  "prescriber",
  "pharmacy",
  "rxNumber",
  "refills",
] as const;

type Body = {
  id?: number;
  assign?: boolean;
  fields?: Partial<Record<(typeof EDITABLE_FIELDS)[number], string | null>>;
};

export async function POST(request: NextRequest) {
  const household = await getHouseholdByScanToken(scanTokenFromRequest(request));
  if (!household) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid medication id." }, { status: 400 });
  }

  const existing = await prisma.medication.findUnique({ where: { id } });
  if (!existing || existing.householdId !== household.id) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }
  if (existing.status !== "pending_review") {
    return NextResponse.json(
      { error: "This scan was already confirmed." },
      { status: 409 },
    );
  }

  const edits: Record<string, string | null> = {};
  for (const field of EDITABLE_FIELDS) {
    const value = body.fields?.[field];
    if (value !== undefined) {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (field === "brandName" && !trimmed) {
        return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      }
      edits[field] = trimmed || null;
    }
  }

  const compartment = body.assign ? await nextFreeCompartment(household.id) : null;
  const medication = await prisma.medication.update({
    where: { id },
    data: {
      ...edits,
      status: "active",
      compartment,
      compartmentSize: compartment != null ? sizeForCompartment(compartment) : null,
    },
  });

  if (compartment != null) {
    void notifyScanDone(null, compartment);
    // Rx bottles that land in a bay get a calendar schedule from the label SIG.
    await ensureRxCalendarSchedule(household.id, id);
  }
  void logActivity(household.id, "scan_confirmed", {
    medicationId: id,
    compartment,
    detail: `${medication.brandName}${compartment != null ? ` → compartment ${compartment}` : " (no compartment)"}`,
  });

  return NextResponse.json({ medication, compartment });
}
