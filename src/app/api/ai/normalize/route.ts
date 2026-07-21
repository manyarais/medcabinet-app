// POST /api/ai/normalize — normalize a medication's identity via RxNorm and
// check for duplicates/refills across the inventory. Saves the result on the
// row (raw label text is never touched). Body: { medicationId, confirmRxcui? }
// confirmRxcui: the user picked one of the candidates — store it as confirmed.

import { prisma } from "@/lib/db";
import { findDuplicates, normalizeMedication, type NormalizationResult } from "@/lib/ai/normalizeMed";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: { medicationId?: number; confirmRxcui?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const id = Number(body.medicationId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid medication id." }, { status: 400 });
  }
  const med = await prisma.medication.findUnique({ where: { id } });
  if (!med) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  // User confirming a specific candidate from a previous MULTIPLE_CANDIDATES run.
  if (body.confirmRxcui) {
    let stored: NormalizationResult | null = null;
    try {
      stored = med.normalizationJson ? (JSON.parse(med.normalizationJson) as NormalizationResult) : null;
    } catch {
      stored = null;
    }
    const pick = stored?.candidate_matches.find((c) => c.rxcui === body.confirmRxcui);
    if (!pick) {
      return NextResponse.json({ error: "That candidate is not on this medication." }, { status: 400 });
    }
    const medication = await prisma.medication.update({
      where: { id },
      data: {
        normalizedName: pick.normalized_name,
        rxcui: pick.rxcui,
        normalizationStatus: "MATCHED",
        normalizationConfidence: 1, // user-confirmed overrides the model score
        normalizationJson: JSON.stringify({ ...stored, match_status: "MATCHED", user_confirmed: true }),
      },
    });
    return NextResponse.json({ medication, confirmed: true });
  }

  const result = await normalizeMedication({
    rawName: med.brandName,
    genericName: med.genericName,
    strengthText: med.dosage,
    formText: med.form,
    medicationId: id,
  });

  await prisma.medication.update({
    where: { id },
    data: {
      normalizedName: result.normalized_name,
      rxcui: result.rxcui,
      normalizationStatus: result.match_status,
      normalizationConfidence: result.match_confidence,
      normalizationJson: JSON.stringify(result),
    },
  });

  const duplicates = await findDuplicates(id);
  return NextResponse.json({ normalization: result, duplicates });
}
