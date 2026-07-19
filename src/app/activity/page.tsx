// Recent activity — append-only event log (scans, confirmations, disposals,
// out/returned, light flashes). Uses neutral wording: "accessed"/"out", never
// "taken", unless the user logged a dose elsewhere.

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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Recent activity</h1>
        <p className="mt-1 text-sm text-zinc-600">Last {events.length} events, newest first.</p>
      </header>

      {events.length === 0 ? (
        <p className="rounded border border-dashed border-zinc-300 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-500">
          No activity yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-zinc-100 py-2 text-sm"
            >
              <span className="text-zinc-900">
                {TYPE_LABELS[event.type] ?? event.type}
                {event.medicationId != null && nameById.has(event.medicationId) && (
                  <span className="font-medium"> — {nameById.get(event.medicationId)}</span>
                )}
                {event.compartment != null && (
                  <span className="text-zinc-500"> (compartment {event.compartment})</span>
                )}
                {event.detail && !nameById.has(event.medicationId ?? -1) && (
                  <span className="text-zinc-500"> — {event.detail}</span>
                )}
              </span>
              <span className="text-xs text-zinc-400">
                {event.createdAt.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
