// POST /api/calendar/schedule — attach a dose schedule to an existing cabinet medication.

import {
  compareDateStrings,
  isValidDateString,
} from "@/lib/dates";
import {
  normalizeDoseTimesInput,
  serializeDoseTimes,
} from "@/lib/doseTimes";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  medicationId?: number;
  dosesPerDay?: number;
  pillsPerDose?: number;
  doseTimes?: unknown;
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
  if (!Number.isInteger(medicationId) || medicationId < 1) {
    return NextResponse.json(
      { error: "Select a medication from your cabinet." },
      { status: 400 },
    );
  }

  const dosesPerDay = Number(body.dosesPerDay);
  const pillsPerDose = Number(body.pillsPerDose ?? 1);
  const startDate = body.startDate?.trim() ?? "";
  const endDate = body.endDate?.trim() ?? "";

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

  const timesResult = normalizeDoseTimesInput(body.doseTimes, dosesPerDay);
  if (!timesResult.ok) {
    return NextResponse.json({ error: timesResult.error }, { status: 400 });
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

  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
  });

  if (!medication || medication.status !== "active") {
    return NextResponse.json(
      { error: "That cabinet medication was not found." },
      { status: 404 },
    );
  }

  const prescription = await prisma.prescription.create({
    data: {
      medicationId,
      dosesPerDay,
      pillsPerDose,
      doseTimes: serializeDoseTimes(timesResult.times),
      startDate,
      endDate,
    },
  });

  return NextResponse.json(
    {
      prescription,
      medicationId,
      brandName: medication.brandName,
    },
    { status: 201 },
  );
}
