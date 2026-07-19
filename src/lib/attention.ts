// Shared exception list for Alerts page + Home alert chip count.

import { getHardwareStatus, type HardwareStatus } from "@/lib/hardwareStatus";
import { prisma } from "@/lib/db";
import {
  effectiveExpiryForMedication,
  SOON_DAYS,
} from "@/lib/expiration";

/** Hours out of the cabinet before it becomes an alert. */
export const OUT_TOO_LONG_HOURS = 12;

export type AttentionAlert = {
  severity: "red" | "amber";
  text: string;
  compartment?: number | null;
  medicationId?: number;
  personName?: string | null;
};

export type AttentionSnapshot = {
  alerts: AttentionAlert[];
  hardware: HardwareStatus;
  soonCount: number;
  pendingScanCount: number;
};

export async function getAttentionSnapshot(): Promise<AttentionSnapshot> {
  const [meds, pendingScanCount, hardware, prescriptions] = await Promise.all([
    prisma.medication.findMany({ where: { status: "active" } }),
    prisma.medication.count({ where: { status: "pending_review" } }),
    getHardwareStatus(),
    prisma.prescription.findMany({
      select: { medicationId: true, endDate: true },
    }),
  ]);

  const endsByMed = new Map<number, string[]>();
  for (const rx of prescriptions) {
    const list = endsByMed.get(rx.medicationId) ?? [];
    list.push(rx.endDate);
    endsByMed.set(rx.medicationId, list);
  }

  const alerts: AttentionAlert[] = [];
  const now = Date.now();
  let soonCount = 0;

  for (const med of meds) {
    if (med.outOfCabinet && med.outSince) {
      const hours = (now - med.outSince.getTime()) / 3600000;
      if (hours >= OUT_TOO_LONG_HOURS) {
        alerts.push({
          severity: "amber",
          text: `${med.brandName} has been out of the cabinet for ${Math.floor(hours)} hours.`,
          compartment: med.compartment,
          medicationId: med.id,
          personName: med.personName,
        });
      }
    }

    const { status, displayDate } = effectiveExpiryForMedication({
      expirationDate: med.expirationDate,
      productType: med.productType,
      prescriptionEndDates: endsByMed.get(med.id),
    });

    if (status === "expired") {
      alerts.push({
        severity: "red",
        text: `${med.brandName} is expired (${displayDate ?? "unknown"}).`,
        compartment: med.compartment,
        medicationId: med.id,
        personName: med.personName,
      });
    } else if (status === "soon") {
      soonCount += 1;
      alerts.push({
        severity: "amber",
        text: `${med.brandName} expires within ${SOON_DAYS} days (${displayDate ?? "unknown"}).`,
        compartment: med.compartment,
        medicationId: med.id,
        personName: med.personName,
      });
    }
  }

  if (pendingScanCount > 0) {
    alerts.push({
      severity: "amber",
      text: `${pendingScanCount} scan${pendingScanCount === 1 ? "" : "s"} waiting for review on the Scan page.`,
    });
  }

  if (hardware.lights === "offline") {
    alerts.push({
      severity: "red",
      text: "Cabinet lights board is unreachable.",
    });
  }
  if (hardware.scanner === "offline") {
    alerts.push({
      severity: "amber",
      text: "Bottle scanner is unreachable.",
    });
  }

  alerts.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "red" ? -1 : 1,
  );

  return { alerts, hardware, soonCount, pendingScanCount };
}
