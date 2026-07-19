// Scan page (Phase 4): trigger the hardware scanner and browse everything it
// has scanned, grouped into each person's library (PATIENT name read off
// prescription labels; anything without a name goes to "Household").

import { ClearLibraryButton } from "@/components/ClearLibraryButton";
import { DeviceScanButton } from "@/components/DeviceScanButton";
import { PendingScanCard, type IngredientWarning } from "@/components/PendingScanCard";
import { PhoneScanForm } from "@/components/PhoneScanForm";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { prisma } from "@/lib/db";
import { overlapsForMedication } from "@/lib/ingredients";
import { parsePhotoPaths } from "@/lib/scanPhotos";
import type { Medication } from "@prisma/client";

export default async function ScanPage() {
  // Everything that came from a scanner has a rawLabelText dump.
  const scanned = await prisma.medication.findMany({
    where: { rawLabelText: { not: null }, status: { not: "disposed" } },
    orderBy: { addedAt: "desc" },
  });
  const pending = scanned.filter((med) => med.status === "pending_review");

  // Duplicate-ingredient info for each pending scan, vs the active household.
  const activeMeds = await prisma.medication.findMany({
    where: { status: "active" },
    select: { id: true, brandName: true, genericName: true, compartment: true },
  });
  const warningsById = new Map<number, IngredientWarning[]>(
    pending.map((med) => [
      med.id,
      overlapsForMedication(med, activeMeds).map((overlap) => ({
        ingredient: overlap.ingredient,
        otherNames: overlap.medications
          .filter((m) => m.id !== med.id)
          .map((m) =>
            m.compartment != null ? `${m.brandName} (compartment ${m.compartment})` : m.brandName,
          ),
      })),
    ]),
  );

  const byPerson = new Map<string, Medication[]>();
  for (const med of scanned.filter((m) => m.status !== "pending_review")) {
    const person = med.personName ?? "Household";
    const list = byPerson.get(person) ?? [];
    list.push(med);
    byPerson.set(person, list);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Scan"
        subtitle="Hardware or camera. Rx bottles file under the patient; OTC goes to Household."
      />

      <DeviceScanButton />
      <PhoneScanForm />

      {pending.length > 0 && (
        <section className="mt-8 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Waiting for review
          </h2>
          {pending.map((med) => (
            <PendingScanCard
              key={med.id}
              med={{
                id: med.id,
                brandName: med.brandName,
                genericName: med.genericName,
                dosage: med.dosage,
                form: med.form,
                expirationDate: med.expirationDate,
                personName: med.personName,
                prescriber: med.prescriber,
                pharmacy: med.pharmacy,
                rxNumber: med.rxNumber,
                refills: med.refills,
                rawLabelText: med.rawLabelText,
                photos: parsePhotoPaths(med.photoPaths),
              }}
              warnings={warningsById.get(med.id) ?? []}
            />
          ))}
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Libraries
          </h2>
          {byPerson.size > 0 && <ClearLibraryButton />}
        </div>
        {byPerson.size === 0 ? (
          <p className="mt-3 rounded-2xl bg-[var(--accent-cream)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
            Nothing scanned yet — run a scan above.
          </p>
        ) : (
          [...byPerson.entries()].map(([person, meds]) => (
            <PersonLibrary key={person} person={person} meds={meds} />
          ))
        )}
      </section>
    </main>
  );
}

function PersonLibrary({ person, meds }: { person: string; meds: Medication[] }) {
  return (
    <div className="mt-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        {person}
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {meds.map((med) => (
          <li
            key={med.id}
            className="rounded-2xl bg-[var(--surface)] px-4 py-3.5 shadow-sm shadow-black/[0.04]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {med.brandName}
              </p>
              <ProductTypeBadge productType={med.productType} />
            </div>
            {med.genericName && (
              <p className="text-xs text-[var(--text-secondary)]">{med.genericName}</p>
            )}
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {[
                med.dosage && `Dosage: ${med.dosage}`,
                med.expirationDate && `Expires: ${med.expirationDate}`,
              ]
                .filter(Boolean)
                .join(" · ") || "No extra details scanned"}
            </p>
            <details className="mt-1.5">
              <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">
                Full label · {med.addedAt.toLocaleString()}
              </summary>
              <pre className="mt-1.5 whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
                {med.rawLabelText}
              </pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
