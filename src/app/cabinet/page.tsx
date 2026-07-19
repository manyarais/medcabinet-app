// Cabinet grid page (Phase 2).
// Two modules (A: 1–9, B: 10–18). Layout polish later — simple stacked groups for now.

import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { CabinetOutToggleButton } from "@/components/CabinetOutToggleButton";
import { CabinetJumpSearch } from "@/components/CabinetJumpSearch";
import {
  compartmentsForModule,
  type CompartmentConfig,
} from "@/lib/compartments";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

type MedInCell = {
  id: number;
  brandName: string;
  productType: string;
  outOfCabinet: boolean;
};

export default async function CabinetPage() {
  const medications = await prisma.medication.findMany({
    where: { status: "active" },
  });

  const byCompartment = new Map<number, MedInCell>(
    medications
      .filter((med) => med.compartment != null)
      .map((med) => [
        med.compartment as number,
        {
          id: med.id,
          brandName: med.brandName,
          productType: med.productType,
          outOfCabinet: med.outOfCabinet,
        },
      ]),
  );

  const outCount = medications.filter((med) => med.outOfCabinet).length;

  const jumpMeds = medications.map((med) => ({
    id: med.id,
    brandName: med.brandName,
    genericName: med.genericName,
    compartment: med.compartment,
    outOfCabinet: med.outOfCabinet,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <header className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">Cabinet</h1>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
            {outCount} out of cabinet
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          Two modules (1–9 and 10–18). Big bays: 15 and 18.
        </p>
      </header>

      <CabinetJumpSearch medications={jumpMeds} />

      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        <ModuleGrid
          title="Module A"
          rangeLabel="1–9"
          cells={compartmentsForModule("A")}
          byCompartment={byCompartment}
        />
        <ModuleGrid
          title="Module B"
          rangeLabel="10–18"
          cells={compartmentsForModule("B")}
          byCompartment={byCompartment}
        />
      </div>
    </main>
  );
}

function ModuleGrid({
  title,
  rangeLabel,
  cells,
  byCompartment,
}: {
  title: string;
  rangeLabel: string;
  cells: CompartmentConfig[];
  byCompartment: Map<number, MedInCell>;
}) {
  return (
    <section className="min-w-0 flex-1">
      <h2 className="mb-2 text-sm font-semibold text-zinc-800">
        {title}{" "}
        <span className="font-normal text-zinc-500">({rangeLabel})</span>
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {cells.map((cell) => (
          <CompartmentCell
            key={cell.number}
            config={cell}
            med={byCompartment.get(cell.number)}
          />
        ))}
      </div>
    </section>
  );
}

function CompartmentCell({
  config,
  med,
}: {
  config: CompartmentConfig;
  med: MedInCell | undefined;
}) {
  if (config.isScanner) {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center rounded border-2 border-dashed border-zinc-400 bg-zinc-200 px-2 py-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Scanner
        </p>
        <p className="mt-1 text-lg font-bold text-zinc-800">#{config.number}</p>
        <p className="mt-1 text-xs text-zinc-500">Not assignable</p>
      </div>
    );
  }

  if (!med) {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center rounded border border-dashed border-zinc-300 bg-zinc-50 px-2 py-3 text-center">
        <p className="text-xs text-zinc-400">Empty</p>
        <p className="mt-1 text-sm font-medium text-zinc-500">#{config.number}</p>
        <p className="mt-0.5 text-[10px] uppercase text-zinc-400">{config.size}</p>
      </div>
    );
  }

  const slug = encodeURIComponent(med.brandName);
  const cellClassName = med.outOfCabinet
    ? "flex min-h-28 flex-col justify-between rounded border-2 border-dashed border-amber-400 bg-amber-50/60 px-2 py-3 opacity-75"
    : "flex min-h-28 flex-col justify-between rounded border border-zinc-300 bg-white px-2 py-3 transition-colors hover:border-[var(--brand-sage-deep)]";
  return (
    <div className={cellClassName}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-zinc-500">#{config.number}</p>
        <div className="flex flex-col items-end gap-1">
          {med.outOfCabinet && (
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              OUT
            </span>
          )}
          <ProductTypeBadge productType={med.productType} />
        </div>
      </div>
      <Link
        href={`/drugs/${slug}`}
        className="mt-2 text-sm font-semibold leading-snug text-zinc-900 hover:underline"
      >
        {med.brandName}
      </Link>
      <p className="mt-1 text-[10px] uppercase text-zinc-400">{config.size}</p>
      <CabinetOutToggleButton
        medicationId={med.id}
        brandName={med.brandName}
        outOfCabinet={med.outOfCabinet}
      />
    </div>
  );
}
