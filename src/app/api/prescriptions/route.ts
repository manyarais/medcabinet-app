// POST /api/prescriptions — add a finite prescription schedule to an Rx medication.

import {
  isValidDateString,
  compareDateStrings,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  medicationId?: number;
  dosesPerDay?: number;
  pillsPerDose?: number;
  startDate?: string;
  endDate?: string;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const medicationId = Number(body.medicationId);
  const dosesPerDay = Number(body.dosesPerDay);
  const pillsPerDose = Number(body.pillsPerDose);
  const startDate = body.startDate?.trim() ?? "";
  const endDate = body.endDate?.trim() ?? "";

  if (!Number.isInteger(medicationId) || medicationId < 1) {
    return NextResponse.json({ error: "medicationId is required." }, { status: 400 });
  }

  if (!Number.isInteger(dosesPerDay) || dosesPerDay < 1 || dosesPerDay > 12) {
    return NextResponse.json(
      { error: "dosesPerDay must be an integer from 1 to 12." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(pillsPerDose) || pillsPerDose < 1 || pillsPerDose > 20) {
    return NextResponse.json(
      { error: "pillsPerDose must be an integer from 1 to 20." },
      { status: 400 },
    );
  }

  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return NextResponse.json(
      { error: "startDate and endDate are required (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  if (compareDateStrings(endDate, startDate) < 0) {
    return NextResponse.json(
      { error: "endDate must be on or after startDate." },
      { status: 400 },
    );
  }

  const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!medication) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  if (medication.productType !== "PRESCRIPTION") {
    return NextResponse.json(
      { error: "Schedules can only be added to prescription medications." },
      { status: 400 },
    );
  }

  const prescription = await prisma.prescription.create({
    data: {
      medicationId,
      dosesPerDay,
      pillsPerDose,
      startDate,
      endDate,
    },
  });

  return NextResponse.json({ prescription }, { status: 201 });
}
