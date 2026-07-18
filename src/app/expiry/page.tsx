// Expiration dashboard: expired → expiring soon → unknown dates → the rest.
// Disposal keeps an audit record but frees the compartment.

import { DisposeButton } from "@/components/DisposeButton";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { prisma } from "@/lib/db";
import { expiryStatusFor, SOON_DAYS, type ExpiryStatus } from "@/lib/expiration";
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
  });
  const disposed = await prisma.medication.findMany({
    where: { status: "disposed" },
    orderBy: { disposedAt: "desc" },
    take: 10,
  });

  const byStatus = new Map<ExpiryStatus, Medication[]>();
  for (const med of meds) {
    const status = expiryStatusFor(med.expirationDate);
    const list = byStatus.get(status) ?? [];
    list.push(med);
    byStatus.set(status, list);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Expiration</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Every active medication by expiration status. Disposing keeps a
          record but frees the compartment.
        </p>
      </header>

      {SECTION_ORDER.map(({ status, title, blurb }) => {
        const list = byStatus.get(status) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={status} className="mb-6">
            <h2
              className={`text-lg font-semibold ${
                status === "expired"
                  ? "text-red-700"
                  : status === "soon"
                    ? "text-amber-700"
                    : "text-zinc-900"
              }`}
            >
              {title} ({list.length})
            </h2>
            {blurb && <p className="text-xs text-zinc-500">{blurb}</p>}
            <ul className="mt-2 flex flex-col gap-2">
              {list.map((med) => (
                <li
                  key={med.id}
                  className={`rounded border px-3 py-2.5 ${
                    status === "expired"
                      ? "border-red-300 bg-red-50/60"
                      : status === "soon"
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {med.brandName}
                        <span className="ml-2 font-normal text-zinc-500">
                          {med.personName ?? "Household"}
                          {med.compartment != null && ` · compartment ${med.compartment}`}
                        </span>
                      </p>
                      <p className="text-xs text-zinc-600">
                        Expiration: {med.expirationDate ?? "unknown"}
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
          <h2 className="text-lg font-semibold text-zinc-400">Recently disposed</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {disposed.map((med) => (
              <li key={med.id} className="text-xs text-zinc-400">
                {med.brandName} — disposed{" "}
                {med.disposedAt ? med.disposedAt.toLocaleDateString() : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
