// Medication reconciliation report — print-friendly list to bring to doctor
// appointments. Browser print → "Save as PDF" covers export.

import { PrintButton } from "@/components/PrintButton";
import { ReportEditableTable } from "@/components/ReportEditableTable";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 print:max-w-3xl">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          className="mb-0 flex-1"
          title="Report"
          subtitle={`Generated ${generated}. Verify against bottles before appointments.`}
        />
        <PrintButton />
      </div>
      <p className="mb-5 text-xs text-[var(--text-secondary)] print:hidden">
        Edit a row to fix name, dosage, person, prescriber, pharmacy, Rx #, or expiry.
        Location is on Cabinet.
      </p>

      <ReportEditableTable meds={reportMeds} />

      {disposed.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Disposed (for the record)
          </h2>
          <ul className="mt-2 text-xs text-[var(--text-secondary)]">
            {disposed.map((med) => (
              <li key={med.id}>
                {med.brandName} — disposed{" "}
                {med.disposedAt ? med.disposedAt.toLocaleDateString() : "(date unknown)"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-[var(--text-secondary)]">
        Lists what is recorded in the household cabinet. Not medical advice — does not
        confirm any medication was taken.
      </p>
    </main>
  );
}
