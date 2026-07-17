// POST /api/calendar/untake — undo the latest scheduled dose for today (delete newest UsageLog).

import {
  dayBoundsLocal,
  isValidDateString,
  todayLocal,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  medicationId?: number;
  date?: string;
};

export async function POST(request: NextRequest) {
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
      { error: "Doses can only be undone for today." },
      { status: 400 },
    );
  }

  const { start, end } = dayBoundsLocal(date);
  const latest = await prisma.usageLog.findFirst({
    where: {
      medicationId,
      symptom: null,
      takenAt: { gte: start, lte: end },
    },
    orderBy: [{ takenAt: "desc" }, { id: "desc" }],
  });

  if (!latest) {
    return NextResponse.json(
      { error: "No logged dose to undo for this medication today." },
      { status: 404 },
    );
  }

  await prisma.usageLog.delete({ where: { id: latest.id } });

  const takenCount = await prisma.usageLog.count({
    where: {
      medicationId,
      symptom: null,
      takenAt: { gte: start, lte: end },
    },
  });

  return NextResponse.json({
    undone: latest,
    takenCount,
  });
}
