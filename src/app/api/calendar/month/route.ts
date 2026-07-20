// GET /api/calendar/month?month=YYYY-MM — per-day dose summaries for the month grid.

import {
  dayBoundsLocal,
  formatDateLocal,
  isDateInInclusiveRange,
  todayLocal,
} from "@/lib/dates";
import { isActiveScheduleInRange } from "@/lib/calendarSchedule";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const MONTH_RE = /^\d{4}-\d{2}$/;

export type MonthDaySummary = {
  date: string;
  totalDoses: number;
  takenDoses: number;
  events: Array<{
    medicationId: number;
    brandName: string;
    doses: number;
    taken: number;
  }>;
};

export async function GET(request: NextRequest) {
  const monthParam =
    request.nextUrl.searchParams.get("month")?.trim() ??
    todayLocal().slice(0, 7);

  if (!MONTH_RE.test(monthParam)) {
    return NextResponse.json(
      { error: "Invalid month. Use ?month=YYYY-MM" },
      { status: 400 },
    );
  }

  const [year, month] = monthParam.split("-").map(Number);
  const monthIndex = month - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = formatDateLocal(new Date(year, monthIndex, 1));
  const monthEnd = formatDateLocal(new Date(year, monthIndex, daysInMonth));

  const prescriptions = await prisma.prescription.findMany({
    include: { medication: true },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
  });

  // Any active med whose schedule overlaps this month (Rx, OTC, bay optional).
  const relevant = prescriptions.filter((rx) =>
    isActiveScheduleInRange(rx, monthStart, monthEnd),
  );

  const medicationIds = [...new Set(relevant.map((rx) => rx.medicationId))];
  const { start: rangeStart } = dayBoundsLocal(monthStart);
  const { end: rangeEnd } = dayBoundsLocal(monthEnd);

  const logs =
    medicationIds.length === 0
      ? []
      : await prisma.usageLog.findMany({
          where: {
            medicationId: { in: medicationIds },
            symptom: null,
            takenAt: { gte: rangeStart, lte: rangeEnd },
          },
        });

  const takenByMedDay = new Map<string, number>();
  for (const log of logs) {
    if (log.medicationId == null) continue;
    const day = formatDateLocal(log.takenAt);
    const key = `${log.medicationId}:${day}`;
    takenByMedDay.set(key, (takenByMedDay.get(key) ?? 0) + 1);
  }

  const days: Record<string, MonthDaySummary> = {};

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const date = formatDateLocal(new Date(year, monthIndex, dayNum));
    const active = relevant.filter((rx) =>
      isDateInInclusiveRange(date, rx.startDate, rx.endDate),
    );

    const byMed = new Map<
      number,
      { brandName: string; doses: number; taken: number }
    >();

    for (const rx of active) {
      const existing = byMed.get(rx.medicationId);
      if (existing) {
        existing.doses += rx.dosesPerDay;
      } else {
        byMed.set(rx.medicationId, {
          brandName: rx.medication.brandName,
          doses: rx.dosesPerDay,
          taken: 0,
        });
      }
    }

    const events = [...byMed.entries()].map(([medicationId, info]) => {
      const takenKey = `${medicationId}:${date}`;
      const taken = Math.min(takenByMedDay.get(takenKey) ?? 0, info.doses);
      return {
        medicationId,
        brandName: info.brandName,
        doses: info.doses,
        taken,
      };
    });

    const totalDoses = events.reduce((sum, e) => sum + e.doses, 0);
    const takenDoses = events.reduce((sum, e) => sum + e.taken, 0);

    days[date] = {
      date,
      totalDoses,
      takenDoses,
      events,
    };
  }

  return NextResponse.json({
    month: monthParam,
    days,
  });
}
