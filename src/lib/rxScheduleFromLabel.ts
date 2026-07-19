// Infer a default Rx calendar schedule from label dosage text.

import { addDaysLocal, todayLocal } from "@/lib/dates";
import { defaultDoseTimes, serializeDoseTimes } from "@/lib/doseTimes";
import { prisma } from "@/lib/db";

export type InferredRxSchedule = {
  dosesPerDay: number;
  pillsPerDose: number;
  doseTimes: string[];
  startDate: string;
  endDate: string;
};

/** Pull doses/day, pills/dose, and duration hints from free-text SIG / dosage. */
export function inferRxScheduleFromLabel(
  dosage: string | null | undefined,
): InferredRxSchedule {
  const text = (dosage ?? "").toLowerCase();

  let dosesPerDay = 1;
  if (
    /\b(four times|4 times|qid|q\.?i\.?d\.?|every\s*6\s*hours?|q6h)\b/.test(text)
  ) {
    dosesPerDay = 4;
  } else if (
    /\b(three times|3 times|tid|t\.?i\.?d\.?|every\s*8\s*hours?|q8h)\b/.test(text)
  ) {
    dosesPerDay = 3;
  } else if (
    /\b(twice|two times|2 times|bid|b\.?i\.?d\.?|every\s*12\s*hours?|q12h)\b/.test(
      text,
    )
  ) {
    dosesPerDay = 2;
  } else if (/\b(once|daily|every day|qd|q\.?d\.?|q24h)\b/.test(text)) {
    dosesPerDay = 1;
  } else {
    const everyHours = text.match(/\bevery\s+(\d+)\s*hours?\b/);
    if (everyHours) {
      const hours = Number(everyHours[1]);
      if (hours > 0 && hours <= 24) {
        dosesPerDay = Math.min(12, Math.max(1, Math.round(24 / hours)));
      }
    }
  }

  let pillsPerDose = 1;
  const takeMatch = text.match(
    /\b(?:take|give)\s+(\d+)\s+(?:tablet|capsule|pill|caplet|cap)s?\b/,
  );
  if (takeMatch) {
    pillsPerDose = Math.min(20, Math.max(1, Number(takeMatch[1])));
  } else {
    const bare = text.match(/\b(\d+)\s+(?:tablet|capsule|pill|caplet)s?\b/);
    if (bare) pillsPerDose = Math.min(20, Math.max(1, Number(bare[1])));
  }

  let durationDays = 30;
  const forDays = text.match(/\bfor\s+(\d+)\s*days?\b/);
  const xDays = text.match(/\bx\s*(\d+)\s*days?\b/);
  const daysOnly = text.match(/\b(\d+)\s*-?\s*day\b/);
  if (forDays) durationDays = Number(forDays[1]);
  else if (xDays) durationDays = Number(xDays[1]);
  else if (daysOnly) durationDays = Number(daysOnly[1]);
  durationDays = Math.min(365, Math.max(1, durationDays));

  const startDate = todayLocal();
  // Inclusive range: start + (N-1) days spans N calendar days.
  const endDate = addDaysLocal(startDate, durationDays - 1);

  return {
    dosesPerDay,
    pillsPerDose,
    doseTimes: defaultDoseTimes(dosesPerDay),
    startDate,
    endDate,
  };
}

/**
 * If this is an Rx med in a cabinet bay with no schedule yet, create one from
 * the label so it shows on the calendar.
 */
export async function ensureRxCalendarSchedule(medicationId: number): Promise<boolean> {
  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
    include: { prescriptions: { select: { id: true }, take: 1 } },
  });

  if (!medication) return false;
  if (medication.productType !== "PRESCRIPTION") return false;
  if (medication.status !== "active") return false;
  if (medication.compartment == null) return false;
  if (medication.prescriptions.length > 0) return false;

  const inferred = inferRxScheduleFromLabel(medication.dosage);
  await prisma.prescription.create({
    data: {
      medicationId,
      dosesPerDay: inferred.dosesPerDay,
      pillsPerDose: inferred.pillsPerDose,
      doseTimes: serializeDoseTimes(inferred.doseTimes),
      startDate: inferred.startDate,
      endDate: inferred.endDate,
    },
  });
  return true;
}
