// Medication detail page (Phase 1 + Phase 2 cabinet actions).
// URL slug is the brand name; we re-run the lookup and show label fields.
// ?from=catalog → product + Add emphasis (manual fallback when scanning isn't possible).
// Cabinet / default → personal medication actions when owned.

import { AddToCabinetForm } from "@/components/AddToCabinetForm";
import { AddPrescriptionForm } from "@/components/AddPrescriptionForm";
import { CabinetMedicationActions } from "@/components/CabinetMedicationActions";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { prisma } from "@/lib/db";
import { lookupDrugs } from "@/lib/drugs";
import type { DrugResult } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function DrugDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { from } = await searchParams;
  const fromCatalog = from === "catalog";
  const brandFromSlug = decodeURIComponent(slug).trim();

  if (!brandFromSlug) {
    notFound();
  }

  let drug: DrugResult | null = null;
  let lookupError: string | null = null;

  try {
    const lookup = await lookupDrugs(brandFromSlug);
    drug =
      lookup.results.find(
        (result) => result.brandName.toLowerCase() === brandFromSlug.toLowerCase(),
      ) ??
      lookup.results[0] ??
      null;
  } catch (error) {
    lookupError = error instanceof Error ? error.message : "Lookup failed";
  }

  const cabinetMedications = await prisma.medication.findMany({
    where: { status: "active" },
    include: { prescriptions: { orderBy: { startDate: "asc" } } },
  });
  const cabinetMatch =
    cabinetMedications.find((med) => brandsEqual(brandFromSlug, med.brandName)) ??
    null;

  // Prefer the openFDA product for catalog taps; never inherit ownership from a
  // fuzzy cousin (e.g. "Tylenol Extra Strength" must not match cabinet "Tylenol").
  const occupied = cabinetMedications
    .filter((med) => med.compartment != null)
    .map((med) => ({
      id: med.id,
      compartment: med.compartment as number,
      brandName: med.brandName,
    }));

  const displayDrug: DrugResult | null =
    drug ??
    (cabinetMatch
      ? {
          brandName: cabinetMatch.brandName,
          genericName: cabinetMatch.genericName,
          productType:
            cabinetMatch.productType === "OTC" ||
            cabinetMatch.productType === "PRESCRIPTION"
              ? cabinetMatch.productType
              : "UNKNOWN",
          purpose: cabinetMatch.purpose,
          indications: cabinetMatch.indications,
          warnings: cabinetMatch.warnings,
          dosage: cabinetMatch.dosage,
          normalizedName: null,
          rxcui: null,
        }
      : null);

  // Catalog taps want product + add first; owned meds always use personal actions.
  const showCatalogAddFirst = fromCatalog && !cabinetMatch && displayDrug != null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <Link href="/" className="mb-6 text-sm font-medium text-[var(--brand-sage-deep)] hover:underline">
        ← Back to search
      </Link>

      {lookupError && !cabinetMatch && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800"
          role="alert"
        >
          Could not load label data: {lookupError}
        </p>
      )}

      {!displayDrug && (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-600">
          No openFDA label found for “{brandFromSlug}”.
        </p>
      )}

      {displayDrug && (
        <article className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ProductTypeBadge productType={displayDrug.productType} />
              {cabinetMatch && (
                <CabinetBadge
                  compartment={cabinetMatch.compartment}
                  outOfCabinet={cabinetMatch.outOfCabinet}
                />
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {displayDrug.brandName}
            </h1>
            <p className="text-base text-zinc-600">
              {displayDrug.genericName ?? "Generic name unavailable"}
            </p>
            {fromCatalog && !cabinetMatch && (
              <p className="text-xs text-zinc-500">
                Product label from openFDA. Prefer scanning the bottle when you have it.
              </p>
            )}
            {!drug && cabinetMatch && (
              <p className="text-xs text-zinc-500">
                Showing saved cabinet data (live label lookup had no match).
              </p>
            )}
          </header>

          {showCatalogAddFirst && (
            <div className="rounded-lg border-2 border-zinc-900 bg-white p-1">
              <AddToCabinetForm drug={displayDrug} occupied={occupied} />
            </div>
          )}

          {cabinetMatch ? (
            <>
              <CabinetMedicationActions medication={cabinetMatch} occupied={occupied} />
              {cabinetMatch.productType === "PRESCRIPTION" && (
                <AddPrescriptionForm
                  medicationId={cabinetMatch.id}
                  brandName={cabinetMatch.brandName}
                  schedules={cabinetMatch.prescriptions.map((rx) => ({
                    id: rx.id,
                    dosesPerDay: rx.dosesPerDay,
                    pillsPerDose: rx.pillsPerDose,
                    doseTimes: rx.doseTimes,
                    startDate: rx.startDate,
                    endDate: rx.endDate,
                  }))}
                />
              )}
            </>
          ) : (
            !showCatalogAddFirst && (
              <AddToCabinetForm drug={displayDrug} occupied={occupied} />
            )
          )}

          <DetailSection title="Purpose" body={displayDrug.purpose} />
          <DetailSection title="Indications & usage" body={displayDrug.indications} />
          <DetailSection title="Dosage & administration" body={displayDrug.dosage} />
          <DetailSection title="Warnings" body={displayDrug.warnings} />
        </article>
      )}
    </main>
  );
}

function CabinetBadge({
  compartment,
  outOfCabinet,
}: {
  compartment: number | null;
  outOfCabinet: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold text-white ${outOfCabinet ? "bg-amber-600" : "bg-zinc-900"}`}
    >
      {outOfCabinet ? "Out of cabinet" : "In cabinet"}
      {compartment != null ? ` — Compartment ${compartment}` : " — pending assignment"}
    </span>
  );
}

function DetailSection({ title, body }: { title: string; body: string | null }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
        {body?.trim() ? body : "Not listed on this label."}
      </p>
    </section>
  );
}

function brandsEqual(a: string, b: string): boolean {
  const left = a.trim().toLowerCase().replace(/\s+/g, " ");
  const right = b.trim().toLowerCase().replace(/\s+/g, " ");
  return Boolean(left && right && left === right);
}
