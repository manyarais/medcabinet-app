// GET /api/symptoms?q= — match OTC cabinet meds by indications/purpose.
// POST /api/symptoms/take — log that the user took a medication for a symptom.

import { prisma } from "@/lib/db";
import { findMatchExcerpt } from "@/lib/symptoms";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const symptom = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!symptom) {
    return NextResponse.json(
      { error: "Missing symptom query. Use ?q=headache" },
      { status: 400 },
    );
  }

  const cabinetMeds = await prisma.medication.findMany({
    where: { status: "active" },
  });

  // PRODUCT SAFETY CONSTRAINT (intentional):
  // Never surface prescription medications in symptom search results —
  // even if their FDA label text happens to mention the symptom.
  // Symptom lookup is OTC-only for this prototype.
  const otcOnly = cabinetMeds.filter((med) => med.productType === "OTC");

  const matches = otcOnly
    .map((med) => {
      const excerpt = findMatchExcerpt(med.purpose, med.indications, symptom);
      if (!excerpt) return null;
      return {
        medicationId: med.id,
        brandName: med.brandName,
        productType: med.productType,
        compartment: med.compartment,
        matchExcerpt: excerpt,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const pastUsage = await prisma.usageLog.findMany({
    where: {
      symptom: { contains: symptom },
    },
    include: { medication: true },
    orderBy: { takenAt: "desc" },
  });

  // Case-insensitive filter in JS (SQLite CONTAINS is case-sensitive by default).
  const symptomLower = symptom.toLowerCase();
  const usedBefore = pastUsage
    .filter((log) => (log.symptom ?? "").toLowerCase().includes(symptomLower))
    .map((log) => ({
      id: log.id,
      medicationId: log.medicationId,
      brandName: log.medication.brandName,
      compartment: log.medication.compartment,
      productType: log.medication.productType,
      symptom: log.symptom,
      takenAt: log.takenAt.toISOString(),
    }));

  return NextResponse.json({
    symptom,
    matches,
    usedBefore,
  });
}
