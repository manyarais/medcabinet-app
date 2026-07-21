// POST /api/calendar/take — mark the next scheduled dose taken (writes UsageLog, symptom null).

import {
  dayBoundsLocal,
  isDateInInclusiveRange,
  isValidDateString,
  todayLocal,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getHousehold } from "@/lib/household";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  medicationId?: number;
  date?: string;
};

export async function POST(request: NextRequest) {
  const household = await getHousehold();
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const medicationId = Number(body.medicationId);
  const date = body.date?.trim() ?? todayLocal();

  if (!Number.isInteger(medicationId) || medicationId < 1) {
    return NextResponse.json({ error: "medicationId is required." }, { status: 400 });
  }

  if (!isValidDateString(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD." }, { status: 400 });
  }

  if (date !== todayLocal()) {
    return NextResponse.json(
      { error: "Doses can only be logged for today." },
      { status: 400 },
    );
  }

  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
    include: { prescriptions: true },
  });

  if (!medication || medication.householdId !== household.id) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  if (medication.status !== "active") {
    return NextResponse.json({ error: "Medication is not active." }, { status: 400 });
  }

  const active = medication.prescriptions.filter((rx) =>
    isDateInInclusiveRange(date, rx.startDate, rx.endDate),
  );

  if (active.length === 0) {
    return NextResponse.json(
      { error: "No active schedule for this day." },
      { status: 400 },
    );
  }

  const dosesDue = active.reduce((sum, rx) => sum + rx.dosesPerDay, 0);
  const { start, end } = dayBoundsLocal(date);
  const takenCount = await prisma.usageLog.count({
    where: {
      householdId: household.id,
      medicationId,
      symptom: null,
      takenAt: { gte: start, lte: end },
    },
  });

  if (takenCount >= dosesDue) {
    return NextResponse.json(
      { error: "All scheduled doses for this day are already logged." },
      { status: 409 },
    );
  }

  // Log at the current time (today only).
  const usageLog = await prisma.usageLog.create({
    data: {
      householdId: household.id,
      medicationId,
      symptom: null,
      takenAt: new Date(),
    },
  });

  return NextResponse.json(
    {
      usageLog,
      takenCount: takenCount + 1,
      dosesDue,
    },
    { status: 201 },
  );
}
