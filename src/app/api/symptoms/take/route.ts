// POST /api/symptoms/take — create a UsageLog when the user taps "Take this".

import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  medicationId?: number;
  symptom?: string;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const medicationId = Number(body.medicationId);
  const symptom = body.symptom?.trim() ?? "";

  if (!Number.isInteger(medicationId) || medicationId < 1) {
    return NextResponse.json({ error: "medicationId is required." }, { status: 400 });
  }

  if (!symptom) {
    return NextResponse.json({ error: "symptom is required." }, { status: 400 });
  }

  const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!medication) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  // Same safety rule as search: do not log "take this" for prescriptions via symptoms.
  if (medication.productType !== "OTC") {
    return NextResponse.json(
      { error: "Only OTC medications can be logged from symptom search." },
      { status: 400 },
    );
  }

  const [usageLog] = await prisma.$transaction([
    prisma.usageLog.create({
      data: {
        medicationId,
        symptom,
      },
    }),
    prisma.medication.update({
      where: { id: medicationId },
      data: { outOfCabinet: true },
    }),
  ]);

  return NextResponse.json({ usageLog }, { status: 201 });
}
