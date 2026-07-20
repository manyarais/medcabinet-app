// Shared filter for prescription rows that belong on the calendar / dose checklist.
// Any active medication with a schedule in range counts — Rx, OTC, bay or no bay.

import { isDateInInclusiveRange } from "@/lib/dates";

export type ScheduledPrescription = {
  startDate: string;
  endDate: string;
  medication: {
    status: string;
  };
};

/** True when the med is active and `date` falls in the schedule window. */
export function isActiveScheduleOnDate(
  rx: ScheduledPrescription,
  date: string,
): boolean {
  return (
    rx.medication.status === "active" &&
    isDateInInclusiveRange(date, rx.startDate, rx.endDate)
  );
}

/**
 * Schedules that overlap [rangeStart, rangeEnd] (inclusive YYYY-MM-DD).
 * Used by the month grid.
 */
export function isActiveScheduleInRange(
  rx: ScheduledPrescription,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  return (
    rx.medication.status === "active" &&
    rx.startDate <= rangeEnd &&
    rx.endDate >= rangeStart
  );
}
