// Collect today's overdue untaken prescription doses (for Twilio dispatch).

import {
  dayBoundsLocal,
  isDateInInclusiveRange,
  todayLocal,
} from "@/lib/dates";
import { doseUrgency, parseDoseTimes } from "@/lib/doseTimes";
import { prisma } from "@/lib/db";

export type OverdueDose = {
  medicationId: number;
  brandName: string;
  absoluteIndex: number;
  doseIndex: number;
  dosesPerDay: number;
  scheduledTime: string;
};

export async function listOverdueDosesToday(now = new Date()): Promise<OverdueDose[]> {
  const date = todayLocal();
  const prescriptions = await prisma.prescription.findMany({
    include: { medication: true },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
  });

  const active = prescriptions.filter(
    (rx) =>
      rx.medication.status === "active" &&
      rx.medication.productType === "PRESCRIPTION" &&
      rx.medication.compartment != null &&
      isDateInInclusiveRange(date, rx.startDate, rx.endDate),
  );

  const medicationIds = [...new Set(active.map((rx) => rx.medicationId))];
  const { start, end } = dayBoundsLocal(date);
  const logs =
    medicationIds.length === 0
      ? []
      : await prisma.usageLog.findMany({
          where: {
            medicationId: { in: medicationIds },
            symptom: null,
            takenAt: { gte: start, lte: end },
          },
        });

  const takenCountByMed = new Map<number, number>();
  for (const log of logs) {
    if (log.medicationId == null) continue;
    takenCountByMed.set(
      log.medicationId,
      (takenCountByMed.get(log.medicationId) ?? 0) + 1,
    );
  }

  const overdue: OverdueDose[] = [];
  for (const rx of active) {
    const times = parseDoseTimes(rx.doseTimes, rx.dosesPerDay);
    const priorSlots = active
      .filter(
        (other) =>
          other.medicationId === rx.medicationId &&
          (other.startDate < rx.startDate ||
            (other.startDate === rx.startDate && other.id < rx.id)),
      )
      .reduce((sum, other) => sum + other.dosesPerDay, 0);

    const takenCount = takenCountByMed.get(rx.medicationId) ?? 0;

    for (let doseIndex = 1; doseIndex <= rx.dosesPerDay; doseIndex++) {
      const absoluteIndex = priorSlots + doseIndex;
      const taken = absoluteIndex <= takenCount;
      const scheduledTime = times[doseIndex - 1] ?? "08:00";
      if (doseUrgency(scheduledTime, taken, now) !== "overdue") continue;

      overdue.push({
        medicationId: rx.medicationId,
        brandName: rx.medication.brandName,
        absoluteIndex,
        doseIndex,
        dosesPerDay: rx.dosesPerDay,
        scheduledTime,
      });
    }
  }

  overdue.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return overdue;
}
