// Recent activity — cabinet events + shared dose check-offs with attribution.

import { PageHeader } from "@/components/ui/PageHeader";
import { memberShortLabel } from "@/lib/clerkUsers";
import { prisma } from "@/lib/db";
import { getHousehold } from "@/lib/household";

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

type FeedItem = {
  key: string;
  at: Date;
  title: string;
  subtitle: string | null;
};

export default async function ActivityPage() {
  const household = await getHousehold();
  const [events, logs] = await Promise.all([
    prisma.activityEvent.findMany({
      where: { householdId: household.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.usageLog.findMany({
      where: { householdId: household.id },
      include: { medication: { select: { brandName: true } } },
      orderBy: { takenAt: "desc" },
      take: 100,
    }),
  ]);

  const medIds = [
    ...new Set(events.map((e) => e.medicationId).filter((v): v is number => v != null)),
  ];
  const meds = await prisma.medication.findMany({
    where: { householdId: household.id, id: { in: medIds } },
    select: { id: true, brandName: true },
  });
  const nameById = new Map(meds.map((m) => [m.id, m.brandName]));

  const takerIds = [
    ...new Set(
      logs
        .map((l) => l.takenByClerkUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const members =
    takerIds.length === 0
      ? []
      : await prisma.householdMember.findMany({
          where: {
            householdId: household.id,
            clerkUserId: { in: takerIds },
          },
          select: { clerkUserId: true, displayName: true, email: true },
        });
  const memberById = new Map(members.map((m) => [m.clerkUserId, m]));

  const feed: FeedItem[] = [
    ...events.map((event) => {
      const medName =
        event.medicationId != null ? nameById.get(event.medicationId) : undefined;
      const parts = [TYPE_LABELS[event.type] ?? event.type];
      if (medName) parts.push(`— ${medName}`);
      return {
        key: `evt-${event.id}`,
        at: event.createdAt,
        title: parts.join(" "),
        subtitle:
          event.compartment != null
            ? `bay ${event.compartment}`
            : event.detail && !medName
              ? event.detail
              : null,
      };
    }),
    ...logs.map((log) => {
      const taker = log.takenByClerkUserId
        ? memberById.get(log.takenByClerkUserId)
        : null;
      const when = log.takenAt.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      const by = taker ? ` · by ${memberShortLabel(taker)}` : "";
      const brand = log.medication?.brandName ?? "Medication";
      const symptomBit = log.symptom?.trim() ? ` (${log.symptom.trim()})` : "";
      return {
        key: `log-${log.id}`,
        at: log.takenAt,
        title: `${brand}${symptomBit}`,
        subtitle: `Taken · ${when}${by}`,
      };
    }),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 100);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Activity"
        subtitle={`Last ${feed.length} events, newest first.`}
      />

      {feed.length === 0 ? (
        <p className="rounded-2xl bg-[var(--accent-cream)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
          No activity yet.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-[var(--surface)] shadow-[var(--shadow-soft)]">
          {feed.map((item, i) => (
            <li
              key={item.key}
              className={`flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-3.5 text-sm ${
                i > 0 ? "border-t border-[var(--border)]" : ""
              }`}
            >
              <span className="text-[var(--text-primary)]">
                <span className="font-semibold">{item.title}</span>
                {item.subtitle && (
                  <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                    {item.subtitle}
                  </span>
                )}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {item.at.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
