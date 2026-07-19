// Expiration dashboard: expired → expiring soon → unknown dates → the rest.
// Disposal keeps an audit record but frees the compartment.

import { DisposeButton } from "@/components/DisposeButton";
import { MedMetaChips } from "@/components/MedMetaChips";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { prisma } from "@/lib/db";
import {
  effectiveExpiryForMedication,
  SOON_DAYS,
  type ExpiryStatus,
} from "@/lib/expiration";
import type { Medication } from "@prisma/client";

export const dynamic = "force-dynamic";

const SECTION_ORDER: Array<{ status: ExpiryStatus; title: string; blurb: string }> = [
  { status: "expired", title: "Expired", blurb: "Dispose of these — check your pharmacy's take-back program." },
  { status: "soon", title: `Expiring within ${SOON_DAYS} days`, blurb: "Plan replacements." },
  { status: "unknown", title: "No readable expiration date", blurb: "Check the bottle and add the date." },
  { status: "ok", title: "Not expiring soon", blurb: "" },
];

export default async function ExpiryPage() {
  const meds = await prisma.medication.findMany({
    where: { status: "active" },
    orderBy: { brandName: "asc" },
    include: { prescriptions: { select: { endDate: true } } },
  });
  const disposed = await prisma.medication.findMany({
    where: { status: "disposed" },
    orderBy: { disposedAt: "desc" },
    take: 10,
  });

  type Row = Medication & { displayDate: string | null };
  const byStatus = new Map<ExpiryStatus, Row[]>();
  for (const med of meds) {
    const { status, displayDate } = effectiveExpiryForMedication({
      expirationDate: med.expirationDate,
      productType: med.productType,
      prescriptionEndDates: med.prescriptions.map((rx) => rx.endDate),
    });
    const list = byStatus.get(status) ?? [];
    list.push({ ...med, displayDate });
    byStatus.set(status, list);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Expiry"
        subtitle="By status. Disposing keeps a record and frees the bay."
      />

      {SECTION_ORDER.map(({ status, title, blurb }) => {
        const list = byStatus.get(status) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={status} className="mb-7">
            <h2
              className={`text-xs font-bold uppercase tracking-wider ${
                status === "expired"
                  ? "text-[var(--danger-text)]"
                  : status === "soon"
                    ? "text-[var(--warning-text)]"
                    : "text-[var(--text-secondary)]"
              }`}
            >
              {title} · {list.length}
            </h2>
            {blurb && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{blurb}</p>
            )}
            <ul className="mt-3 flex flex-col gap-2">
              {list.map((med) => (
                <li
                  key={med.id}
                  className={`rounded-2xl px-4 py-3.5 shadow-[var(--shadow-soft)] ${
                    status === "expired"
                      ? "bg-[var(--danger-bg)]"
                      : status === "soon"
                        ? "bg-[var(--warning-bg)]"
                        : "bg-[var(--surface)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {med.brandName}
                      </p>
                      <div className="mt-1.5">
                        <MedMetaChips
                          personName={med.personName}
                          compartment={med.compartment}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                        Expires {med.displayDate ?? "unknown"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProductTypeBadge productType={med.productType} />
                      <DisposeButton medicationId={med.id} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {disposed.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Recently disposed
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {disposed.map((med) => (
              <li key={med.id} className="text-xs text-[var(--text-secondary)]">
                {med.brandName} —{" "}
                {med.disposedAt ? med.disposedAt.toLocaleDateString() : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
