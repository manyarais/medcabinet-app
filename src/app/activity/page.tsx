// Recent activity — append-only event log (scans, confirmations, disposals,
// out/returned, light flashes). Uses neutral wording: "accessed"/"out", never
// "taken", unless the user logged a dose elsewhere.

import { PageHeader } from "@/components/ui/PageHeader";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  scan_saved: "Bottle scanned",
  scan_confirmed: "Scan confirmed",
  scan_discarded: "Scan discarded",
  disposed: "Marked disposed",
  out: "Marked out of cabinet",
  returned: "Returned to cabinet",
  flash: "Compartment light flashed",
  travel_pack: "Packed for travel",
  travel_return: "Back from travel",
  demo_reset: "Demo data reset",
};

export default async function ActivityPage() {
  const events = await prisma.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const medIds = [...new Set(events.map((e) => e.medicationId).filter((v): v is number => v != null))];
  const meds = await prisma.medication.findMany({
    where: { id: { in: medIds } },
    select: { id: true, brandName: true },
  });
  const nameById = new Map(meds.map((m) => [m.id, m.brandName]));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Activity"
        subtitle={`Last ${events.length} events, newest first.`}
      />

      {events.length === 0 ? (
        <p className="rounded-2xl bg-[var(--accent-cream)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
          No activity yet.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-[var(--surface)] shadow-sm shadow-black/[0.04]">
          {events.map((event, i) => (
            <li
              key={event.id}
              className={`flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-3.5 text-sm ${
                i > 0 ? "border-t border-[var(--border)]" : ""
              }`}
            >
              <span className="text-[var(--text-primary)]">
                {TYPE_LABELS[event.type] ?? event.type}
                {event.medicationId != null && nameById.has(event.medicationId) && (
                  <span className="font-semibold"> — {nameById.get(event.medicationId)}</span>
                )}
                {event.compartment != null && (
                  <span className="text-[var(--text-secondary)]"> · bay {event.compartment}</span>
                )}
                {event.detail && !nameById.has(event.medicationId ?? -1) && (
                  <span className="text-[var(--text-secondary)]"> — {event.detail}</span>
                )}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {event.createdAt.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
