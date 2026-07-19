// Medication reconciliation report — print-friendly list to bring to doctor
// appointments. Browser print → "Save as PDF" covers export.

import { PrintButton } from "@/components/PrintButton";
import { ReportEditableTable } from "@/components/ReportEditableTable";
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

  const reportMeds = meds.map((med) => ({
    id: med.id,
    brandName: med.brandName,
    genericName: med.genericName,
    productType: med.productType,
    form: med.form,
    dosage: med.dosage,
    personName: med.personName,
    prescriber: med.prescriber,
    pharmacy: med.pharmacy,
    rxNumber: med.rxNumber,
    expirationDate: med.expirationDate,
    compartment: med.compartment,
    outOfCabinet: med.outOfCabinet,
    expiryLabel: expiryStatusFor(med.expirationDate),
  }));

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
          <p className="mt-1 text-xs text-zinc-500 print:hidden">
            Use Edit on a row to fix name, dosage, who it belongs to, prescriber,
            pharmacy, Rx #, or expiry. Location is managed on Cabinet.
          </p>
        </div>
        <PrintButton />
      </header>

      <ReportEditableTable meds={reportMeds} />

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
