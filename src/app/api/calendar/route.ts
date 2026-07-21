// GET /api/calendar?date=YYYY-MM-DD — doses due that day from active prescriptions.
// Taken state is derived from UsageLog rows with symptom = null for that medication/day.

import {
  dayBoundsLocal,
  isValidDateString,
  todayLocal,
} from "@/lib/dates";
import { isActiveScheduleOnDate } from "@/lib/calendarSchedule";
import { parseDoseTimes } from "@/lib/doseTimes";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/household";
import { NextRequest, NextResponse } from "next/server";

export type CalendarDose = {
  prescriptionId: number;
  medicationId: number;
  brandName: string;
  compartment: number | null;
  doseIndex: number;
  /** Slot index within this med's combined day (1…N); used for take/untake ordering. */
  absoluteIndex: number;
  dosesPerDay: number;
  pillsPerDose: number;
  /** Local HH:MM scheduled time for this dose slot. */
  scheduledTime: string;
  taken: boolean;
};

export async function GET(request: NextRequest) {
  const { household } = await requireCapability("read");
  const dateParam = request.nextUrl.searchParams.get("date")?.trim() ?? todayLocal();

  if (!isValidDateString(dateParam)) {
    return NextResponse.json(
      { error: "Invalid date. Use ?date=YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const prescriptions = await prisma.prescription.findMany({
    where: { householdId: household.id },
    include: { medication: true },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
  });

  // Any active med with a schedule for this day (Rx, OTC, bay optional).
  const active = prescriptions.filter((rx) =>
    isActiveScheduleOnDate(rx, dateParam),
  );

  const { start, end } = dayBoundsLocal(dateParam);
  const medicationIds = [...new Set(active.map((rx) => rx.medicationId))];

  const logs =
    medicationIds.length === 0
      ? []
      : await prisma.usageLog.findMany({
          where: {
            householdId: household.id,
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

  const doses: CalendarDose[] = [];
  for (const rx of active) {
    const times = parseDoseTimes(rx.doseTimes, rx.dosesPerDay);
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
        absoluteIndex,
        dosesPerDay: rx.dosesPerDay,
        pillsPerDose: rx.pillsPerDose,
        scheduledTime: times[doseIndex - 1] ?? "08:00",
        taken: absoluteIndex <= takenCount,
      });
    }
  }

  doses.sort((a, b) => {
    const byTime = a.scheduledTime.localeCompare(b.scheduledTime);
    if (byTime !== 0) return byTime;
    return a.brandName.localeCompare(b.brandName);
  });

  const today = todayLocal();
  return NextResponse.json({
    date: dateParam,
    isToday: dateParam === today,
    isPast: dateParam < today,
    isFuture: dateParam > today,
    doses,
  });
}
