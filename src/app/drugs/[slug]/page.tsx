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

export const dynamic = "force-dynamic";

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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <Link
        href="/"
        className="mb-5 text-sm font-semibold text-[var(--primary)]"
      >
        ← Back
      </Link>

      {lookupError && !cabinetMatch && (
        <p
          className="mb-4 rounded-2xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
          role="alert"
        >
          Could not load label data: {lookupError}
        </p>
      )}

      {!displayDrug && (
        <p className="rounded-2xl bg-[var(--accent-cream)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
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
            <h1 className="text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[var(--text-primary)]">
              {displayDrug.brandName}
            </h1>
            <p className="text-[15px] text-[var(--text-secondary)]">
              {displayDrug.genericName ?? "Generic name unavailable"}
            </p>
            {fromCatalog && !cabinetMatch && (
              <p className="text-xs text-[var(--text-secondary)]">
                Product label from openFDA. Prefer scanning the bottle when you have it.
              </p>
            )}
            {!drug && cabinetMatch && (
              <p className="text-xs text-[var(--text-secondary)]">
                Showing saved cabinet data (live label lookup had no match).
              </p>
            )}
          </header>

          {showCatalogAddFirst && (
            <div className="rounded-2xl bg-[var(--surface)] p-1 shadow-[var(--shadow-soft)] ring-2 ring-[var(--primary)]">
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        outOfCabinet
          ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
          : "bg-[var(--otc-bg)] text-[var(--otc-text)]"
      }`}
    >
      {outOfCabinet ? "Out" : "In cabinet"}
      {compartment != null ? ` · ${compartment}` : " · pending"}
    </span>
  );
}

function DetailSection({ title, body }: { title: string; body: string | null }) {
  return (
    <section className="rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-soft)]">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
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
