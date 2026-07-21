// POST /api/ai/plain-language — plain-language explanation of a medication's
// CONFIRMED label instructions. Refuses for unreviewed AI-extracted text (the
// user must confirm the scan first) and stores the result beside — never in
// place of — the original wording.

import { prisma } from "@/lib/db";
import { explainInstructions, type PlainLanguageResult } from "@/lib/ai/plainLanguage";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: { medicationId?: number; refresh?: boolean };
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
  if (!med || med.status === "disposed") {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  // Spec: never simplify unconfirmed OCR. "active" means the user reviewed the
  // scan (or typed the entry themselves); pending_review is still raw OCR.
  const confirmed = med.verificationStatus === "USER_CONFIRMED" || med.status === "active";
  if (!confirmed) {
    return NextResponse.json(
      { error: "Confirm this medication's label on the Scan page first — Pillio only simplifies checked information." },
      { status: 409 },
    );
  }

  if (med.instructionsPlain && !body.refresh) {
    try {
      return NextResponse.json({
        result: JSON.parse(med.instructionsPlain) as PlainLanguageResult,
        cached: true,
      });
    } catch {
      // fall through and regenerate
    }
  }

  const original = med.dosage?.trim() || directionsFromTranscript(med.rawLabelText);
  if (!original) {
    return NextResponse.json(
      { error: "This medication has no instruction text on record to explain." },
      { status: 422 },
    );
  }

  const result = await explainInstructions({
    originalText: original,
    medicationId: id,
    warningsText: med.warnings,
  });

  await prisma.medication.update({
    where: { id },
    data: { instructionsPlain: JSON.stringify(result) },
  });

  return NextResponse.json({ result, cached: false });
}

function directionsFromTranscript(raw: string | null): string | null {
  if (!raw) return null;
  const line = raw.split("\n").find((l) => l.startsWith("DIRECTIONS:"));
  return line ? line.slice("DIRECTIONS:".length).replace(/\[\?\]/g, "").trim() : null;
}
