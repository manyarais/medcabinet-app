// Server data for the home dashboard (previews only — no mutations).

import { getAttentionSnapshot } from "@/lib/attention";
import {
  dayBoundsLocal,
  todayLocal,
} from "@/lib/dates";
import { isActiveScheduleOnDate } from "@/lib/calendarSchedule";
import { prisma } from "@/lib/db";

export type TodayDoseSummary = {
  medicationId: number;
  brandName: string;
  doses: number;
  taken: number;
};

export type HomeDashboardData = {
  today: string;
  doseSummaries: TodayDoseSummary[];
  activeMedCount: number;
  outOfCabinetCount: number;
  alertCount: number;
  soonCount: number;
};

export async function getHomeDashboardData(): Promise<HomeDashboardData> {
  const today = todayLocal();

  const [medications, prescriptions, attention] = await Promise.all([
    prisma.medication.findMany({
      where: { status: "active" },
      select: {
        id: true,
        brandName: true,
        outOfCabinet: true,
      },
    }),
    prisma.prescription.findMany({
      include: { medication: true },
      orderBy: [{ startDate: "asc" }, { id: "asc" }],
    }),
    getAttentionSnapshot(),
  ]);

  const active = prescriptions.filter((rx) =>
    isActiveScheduleOnDate(rx, today),
  );

  const medicationIds = [...new Set(active.map((rx) => rx.medicationId))];
  const { start, end } = dayBoundsLocal(today);
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

  const byMed = new Map<number, TodayDoseSummary>();
  for (const rx of active) {
    const existing = byMed.get(rx.medicationId);
    if (existing) {
      existing.doses += rx.dosesPerDay;
    } else {
      byMed.set(rx.medicationId, {
        medicationId: rx.medicationId,
        brandName: rx.medication.brandName,
        doses: rx.dosesPerDay,
        taken: 0,
      });
    }
  }

  for (const summary of byMed.values()) {
    summary.taken = Math.min(
      takenCountByMed.get(summary.medicationId) ?? 0,
      summary.doses,
    );
  }

  const doseSummaries = [...byMed.values()].sort((a, b) =>
    a.brandName.localeCompare(b.brandName),
  );

  return {
    today,
    doseSummaries,
    activeMedCount: medications.length,
    outOfCabinetCount: medications.filter((m) => m.outOfCabinet).length,
    alertCount: attention.alerts.length,
    soonCount: attention.soonCount,
  };
}
