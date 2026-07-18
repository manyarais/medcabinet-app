// Medication reconciliation report — print-friendly list to bring to doctor
// appointments. Browser print → "Save as PDF" covers export.

import { PrintButton } from "@/components/PrintButton";
import { prisma } from "@/lib/db";
import { expiryStatusFor } from "@/lib/expiration";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const meds = await prisma.medication.findMany({
    where: { status: "active" },
    orderBy: [{ personName: "asc" }, { brandName: "asc" }],
  });
  const disposed = await prisma.medication.findMany({
    where: { status: "disposed" },
    orderBy: { disposedAt: "desc" },
  });

  const generated = new Date().toLocaleString();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Medication reconciliation report
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Generated {generated}. Household medications currently on record in
            Pillio — verify against physical bottles before appointments.
          </p>
        </div>
        <PrintButton />
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-400 text-left text-xs uppercase tracking-wide text-zinc-600">
              <th className="py-2 pr-3">Medication</th>
              <th className="py-2 pr-3">Strength / instructions</th>
              <th className="py-2 pr-3">Belongs to</th>
              <th className="py-2 pr-3">Prescriber / pharmacy</th>
              <th className="py-2 pr-3">Expires</th>
              <th className="py-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {meds.map((med) => {
              const expiry = expiryStatusFor(med.expirationDate);
              return (
                <tr key={med.id} className="border-b border-zinc-200 align-top">
                  <td className="py-2 pr-3">
                    <span className="font-semibold">{med.brandName}</span>
                    {med.genericName && (
                      <span className="block text-xs text-zinc-500">{med.genericName}</span>
                    )}
                    <span className="block text-xs text-zinc-500">
                      {med.productType}
                      {med.form ? ` · ${med.form}` : ""}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-xs">{med.dosage ?? "—"}</td>
                  <td className="py-2 pr-3">{med.personName ?? "Household"}</td>
                  <td className="py-2 pr-3 text-xs">
                    {[med.prescriber, med.pharmacy].filter(Boolean).join(" / ") || "—"}
                    {med.rxNumber && (
                      <span className="block text-zinc-500">Rx {med.rxNumber}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {med.expirationDate ?? "unknown"}
                    {expiry === "expired" && (
                      <span className="block text-xs font-bold text-red-700">EXPIRED</span>
                    )}
                  </td>
                  <td className="py-2">
                    {med.outOfCabinet
                      ? "Out of cabinet"
                      : med.compartment != null
                        ? `Compartment ${med.compartment}`
                        : "Not in cabinet"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {disposed.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-zinc-500">
            Disposed medications (for the record)
          </h2>
          <ul className="mt-1 text-xs text-zinc-500">
            {disposed.map((med) => (
              <li key={med.id}>
                {med.brandName} — disposed{" "}
                {med.disposedAt ? med.disposedAt.toLocaleDateString() : "(date unknown)"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-xs text-zinc-400">
        This report lists what is physically recorded in the household cabinet.
        It is not medical advice and does not confirm any medication was taken.
      </p>
    </main>
  );
}
