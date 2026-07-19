// Exception-based alerts: only things that need attention, never a feed of
// everything. Also shows live device connectivity.

import { FlashCompartmentButton } from "@/components/FlashCompartmentButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { probeCabinetBoard } from "@/lib/cabinetBoard";
import { prisma } from "@/lib/db";
import { expiryStatusFor, SOON_DAYS } from "@/lib/expiration";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** Hours out of the cabinet before it becomes an alert. */
const OUT_TOO_LONG_HOURS = 12;

async function probeScanner(): Promise<boolean> {
  const candidates = [
    ...(process.env.DEVICE_URL ?? "").split(",").map((u) => u.trim()).filter(Boolean),
    "http://10.103.209.24",
    "http://172.20.10.3",
  ];
  for (const base of [...new Set(candidates)]) {
    try {
      const res = await fetch(`${base}/apikey`, {
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) return true;
    } catch {
      // keep probing
    }
  }
  return false;
}

type Alert = {
  severity: "red" | "amber";
  text: string;
  compartment?: number | null;
};

export default async function AlertsPage() {
  const meds = await prisma.medication.findMany({ where: { status: "active" } });
  const pendingCount = await prisma.medication.count({
    where: { status: "pending_review" },
  });
  const [scannerUp, cabinetUp] = await Promise.all([
    probeScanner(),
    probeCabinetBoard(),
  ]);

  const alerts: Alert[] = [];
  const now = Date.now();

  for (const med of meds) {
    const person = med.personName ?? "Household";
    if (med.outOfCabinet && med.outSince) {
      const hours = (now - med.outSince.getTime()) / 3600000;
      if (hours >= OUT_TOO_LONG_HOURS) {
        alerts.push({
          severity: "amber",
          text: `${med.brandName} (${person}) has been out of the cabinet for ${Math.floor(hours)} hours.`,
          compartment: med.compartment,
        });
      }
    }
    const expiry = expiryStatusFor(med.expirationDate);
    if (expiry === "expired") {
      alerts.push({
        severity: "red",
        text: `${med.brandName} (${person}) is expired (${med.expirationDate}).`,
        compartment: med.compartment,
      });
    } else if (expiry === "soon") {
      alerts.push({
        severity: "amber",
        text: `${med.brandName} (${person}) expires within ${SOON_DAYS} days (${med.expirationDate}).`,
        compartment: med.compartment,
      });
    }
  }
  if (pendingCount > 0) {
    alerts.push({
      severity: "amber",
      text: `${pendingCount} scan${pendingCount === 1 ? "" : "s"} waiting for review on the Scan page.`,
    });
  }
  if (!cabinetUp) {
    alerts.push({ severity: "red", text: "Cabinet lights board is unreachable." });
  }
  if (!scannerUp) {
    alerts.push({ severity: "amber", text: "Bottle scanner is unreachable." });
  }

  alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "red" ? -1 : 1));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Alerts"
        subtitle="Only exceptions show here — empty is good."
      />

      <div className="mb-5 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full px-3 py-1.5 font-semibold ${
            scannerUp
              ? "bg-[var(--otc-bg)] text-[var(--otc-text)]"
              : "bg-[var(--danger-bg)] text-[var(--danger-text)]"
          }`}
        >
          Scanner {scannerUp ? "online" : "offline"}
        </span>
        <span
          className={`rounded-full px-3 py-1.5 font-semibold ${
            cabinetUp
              ? "bg-[var(--otc-bg)] text-[var(--otc-text)]"
              : "bg-[var(--danger-bg)] text-[var(--danger-text)]"
          }`}
        >
          Lights {cabinetUp ? "online" : "offline"}
        </span>
      </div>

      {alerts.length === 0 ? (
        <p className="rounded-2xl bg-[var(--otc-bg)] px-4 py-10 text-center text-sm font-medium text-[var(--otc-text)]">
          Nothing needs attention.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map((alert, index) => (
            <li
              key={index}
              className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-3.5 text-sm shadow-sm shadow-black/[0.04] ${
                alert.severity === "red"
                  ? "bg-[var(--danger-bg)] text-[var(--danger-text)]"
                  : "bg-[var(--warning-bg)] text-[var(--warning-text)]"
              }`}
            >
              <span className="font-medium">{alert.text}</span>
              {alert.compartment != null && (
                <FlashCompartmentButton compartment={alert.compartment} />
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-[var(--text-secondary)]">
        Full history lives in{" "}
        <Link href="/activity" className="font-semibold text-[var(--primary)]">
          Activity
        </Link>
        .
      </p>
    </main>
  );
}
