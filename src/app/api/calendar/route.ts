// GET /api/calendar?date=YYYY-MM-DD — doses due that day from active prescriptions.
// Taken state is derived from UsageLog rows with symptom = null for that medication/day.

import {
  dayBoundsLocal,
  isDateInInclusiveRange,
  isValidDateString,
  todayLocal,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export type CalendarDose = {
  prescriptionId: number;
  medicationId: number;
  brandName: string;
  compartment: number | null;
  doseIndex: number;
  dosesPerDay: number;
  pillsPerDose: number;
  taken: boolean;
};

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date")?.trim() ?? todayLocal();

  if (!isValidDateString(dateParam)) {
    return NextResponse.json(
      { error: "Invalid date. Use ?date=YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const prescriptions = await prisma.prescription.findMany({
    include: { medication: true },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
  });

  const active = prescriptions.filter(
    (rx) =>
      rx.medication.status === "active" &&
      rx.medication.productType === "PRESCRIPTION" &&
      isDateInInclusiveRange(dateParam, rx.startDate, rx.endDate),
  );

  const { start, end } = dayBoundsLocal(dateParam);
  const medicationIds = [...new Set(active.map((rx) => rx.medicationId))];

  const logs =
    medicationIds.length === 0
      ? []
      : await prisma.usageLog.findMany({
          where: {
            medicationId: { in: medicationIds },
            symptom: null,
            takenAt: { gte: start, lte: end },
          },
          orderBy: { takenAt: "asc" },
        });

  const takenCountByMed = new Map<number, number>();
  for (const log of logs) {
    if (log.medicationId == null) continue;
    takenCountByMed.set(
      log.medicationId,
      (takenCountByMed.get(log.medicationId) ?? 0) + 1,
    );
  }

  // If a med has multiple overlapping prescriptions, sum dosesPerDay for the day
  // but still share one UsageLog pool per medication (count-based Dose 1…N).
  const dosesPerDayByMed = new Map<number, number>();
  for (const rx of active) {
    dosesPerDayByMed.set(
      rx.medicationId,
      (dosesPerDayByMed.get(rx.medicationId) ?? 0) + rx.dosesPerDay,
    );
  }

  const doses: CalendarDose[] = [];
  for (const rx of active) {
    for (let doseIndex = 1; doseIndex <= rx.dosesPerDay; doseIndex++) {
      // Offset within this med's combined day slots by previous rx on same med.
      const priorSlots = active
        .filter(
          (other) =>
            other.medicationId === rx.medicationId &&
            (other.startDate < rx.startDate ||
              (other.startDate === rx.startDate && other.id < rx.id)),
        )
        .reduce((sum, other) => sum + other.dosesPerDay, 0);
      const absoluteIndex = priorSlots + doseIndex;
      const takenCount = takenCountByMed.get(rx.medicationId) ?? 0;

      doses.push({
        prescriptionId: rx.id,
        medicationId: rx.medicationId,
        brandName: rx.medication.brandName,
        compartment: rx.medication.compartment,
        doseIndex,
        dosesPerDay: rx.dosesPerDay,
        pillsPerDose: rx.pillsPerDose,
        taken: absoluteIndex <= takenCount,
      });
    }
  }

  const today = todayLocal();
  return NextResponse.json({
    date: dateParam,
    isToday: dateParam === today,
    isPast: dateParam < today,
    isFuture: dateParam > today,
    doses,
  });
}
