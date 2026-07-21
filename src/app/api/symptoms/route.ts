// GET /api/symptoms?q= — match OTC cabinet meds by indications/purpose.
// POST /api/symptoms/take — log that the user took a medication for a symptom.

import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/household";
import { hasCapability } from "@/lib/permissions";
import { matchOtcCabinetMeds } from "@/lib/symptomMatch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { household, membership, role } = await requireCapability("read");
  const symptom = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!symptom) {
    return NextResponse.json(
      { error: "Missing symptom query. Use ?q=headache" },
      { status: 400 },
    );
  }

  const cabinetMeds = await prisma.medication.findMany({
    where: { householdId: household.id, status: "active" },
  });

  // PRODUCT SAFETY: OTC-only matches (see matchOtcCabinetMeds).
  const matches = matchOtcCabinetMeds(cabinetMeds, symptom);

  const canSeeSymptomHistory = hasCapability(role, "seeSymptomHistory", {
    canSeeSymptomHistory: membership.canSeeSymptomHistory,
  });
  const pastUsage = canSeeSymptomHistory
    ? await prisma.usageLog.findMany({
        where: {
          householdId: household.id,
          symptom: { contains: symptom },
        },
        include: { medication: true },
        orderBy: { takenAt: "desc" },
      })
    : [];

  // Case-insensitive filter in JS (SQLite CONTAINS is case-sensitive by default).
  const symptomLower = symptom.toLowerCase();
  const usedBefore = pastUsage
    .filter((log) => (log.symptom ?? "").toLowerCase().includes(symptomLower))
    .map((log) => ({
      id: log.id,
      medicationId: log.medicationId,
      brandName: log.medication?.brandName ?? "Removed medication",
      compartment: log.medication?.compartment ?? null,
      productType: log.medication?.productType ?? "UNKNOWN",
      symptom: log.symptom,
      takenAt: log.takenAt.toISOString(),
    }));

  return NextResponse.json({
    symptom,
    matches,
    ...(canSeeSymptomHistory ? { usedBefore } : {}),
  });
}
