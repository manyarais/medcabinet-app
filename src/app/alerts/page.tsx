// Exception-based alerts: only things that need attention, never a feed of
// everything. Hardware offline only alerts when previously paired / configured.

import { CaregiverSummaryCard } from "@/components/CaregiverSummaryCard";
import { FlashCompartmentButton } from "@/components/FlashCompartmentButton";
import { MedMetaChips } from "@/components/MedMetaChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAttentionSnapshot } from "@/lib/attention";
import type { DeviceLinkStatus } from "@/lib/hardwareStatus";
import Link from "next/link";

export const dynamic = "force-dynamic";

function DeviceChip({
  label,
  status,
}: {
  label: string;
  status: DeviceLinkStatus;
}) {
  if (status === "online") {
    return (
      <span className="rounded-full bg-[var(--otc-bg)] px-3 py-1.5 font-semibold text-[var(--otc-text)]">
        {label} online
      </span>
    );
  }
  if (status === "offline") {
    return (
      <span className="rounded-full bg-[var(--danger-bg)] px-3 py-1.5 font-semibold text-[var(--danger-text)]">
        {label} offline
      </span>
    );
  }
  return null;
}

export default async function AlertsPage() {
  const { alerts, hardware } = await getAttentionSnapshot();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Alerts"
        subtitle="Only exceptions show here — empty is good."
      />

      <CaregiverSummaryCard />

      <div className="mb-5 flex flex-wrap gap-2 text-xs">
        {hardware.quietUnpaired ? (
          <span className="rounded-full bg-[var(--surface-tint)] px-3 py-1.5 font-semibold text-[var(--text-secondary)]">
            No cabinet hardware connected
          </span>
        ) : (
          <>
            <DeviceChip label="Scanner" status={hardware.scanner} />
            <DeviceChip label="Lights" status={hardware.lights} />
          </>
        )}
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
              className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-3.5 text-sm shadow-[var(--shadow-soft)] ${
                alert.severity === "red"
                  ? "bg-[var(--danger-bg)] text-[var(--danger-text)]"
                  : "bg-[var(--warning-bg)] text-[var(--warning-text)]"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{alert.text}</p>
                {(alert.personName != null || alert.compartment != null) && (
                  <div className="mt-1.5">
                    <MedMetaChips
                      personName={alert.personName}
                      compartment={alert.compartment}
                    />
                  </div>
                )}
              </div>
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
