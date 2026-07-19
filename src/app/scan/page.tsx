// Scan page (Phase 4): trigger the hardware scanner and browse everything it
// has scanned, grouped into each person's library (PATIENT name read off
// prescription labels; anything without a name goes to "Household").

import { ClearLibraryButton } from "@/components/ClearLibraryButton";
import { DeviceScanButton } from "@/components/DeviceScanButton";
import { PendingScanCard, type IngredientWarning } from "@/components/PendingScanCard";
import { PhoneScanForm } from "@/components/PhoneScanForm";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Scan</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Scan a pill bottle with the cabinet hardware or your camera.
          Prescription bottles are filed under the patient&apos;s name;
          everything else goes to the Household library.
        </p>
      </header>

      <DeviceScanButton />
      <PhoneScanForm />

      {pending.length > 0 && (
        <section className="mt-8 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Waiting for your review
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
          <h2 className="text-lg font-semibold text-zinc-900">Libraries</h2>
          {byPerson.size > 0 && <ClearLibraryButton />}
        </div>
        {byPerson.size === 0 ? (
          <p className="mt-3 rounded border border-dashed border-zinc-300 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-500">
            Nothing scanned yet — run your first scan above.
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
    <div className="mt-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {person}&apos;s library
      </h3>
      <ul className="mt-2 flex flex-col gap-2">
        {meds.map((med) => (
          <li
            key={med.id}
            className="rounded border border-zinc-200 bg-white px-3 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900">
                {med.brandName}
              </p>
              <ProductTypeBadge productType={med.productType} />
            </div>
            {med.genericName && (
              <p className="text-xs text-zinc-500">{med.genericName}</p>
            )}
            <p className="mt-1 text-xs text-zinc-600">
              {[
                med.dosage && `Dosage: ${med.dosage}`,
                med.expirationDate && `Expires: ${med.expirationDate}`,
              ]
                .filter(Boolean)
                .join(" · ") || "No extra details scanned"}
            </p>
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-zinc-400">
                Full label text · scanned {med.addedAt.toLocaleString()}
              </summary>
              <pre className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">
                {med.rawLabelText}
              </pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
