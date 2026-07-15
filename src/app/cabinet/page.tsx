// Cabinet grid page (Phase 2).
// Shows assignable compartments 1–8 plus a distinct Scanner cell for bay 9.
// Layout polish comes later — this is a simple functional grid.

import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import {
  SCANNER_COMPARTMENT,
  TOTAL_COMPARTMENTS,
  isScannerCompartment,
} from "@/lib/compartments";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function CabinetPage() {
  const medications = await prisma.medication.findMany({
    where: { status: "active" },
  });

  const byCompartment = new Map(
    medications
      .filter((med) => med.compartment != null)
      .map((med) => [med.compartment as number, med]),
  );

  const cells = Array.from({ length: TOTAL_COMPARTMENTS }, (_, index) => index + 1);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Cabinet</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Physical module: compartments 1–8 hold medications; {SCANNER_COMPARTMENT} is the
          scanner bay.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {cells.map((compartment) => {
          if (isScannerCompartment(compartment)) {
            return (
              <div
                key={compartment}
                className="flex min-h-28 flex-col items-center justify-center rounded border-2 border-dashed border-zinc-400 bg-zinc-200 px-2 py-3 text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Scanner
                </p>
                <p className="mt-1 text-lg font-bold text-zinc-800">#{compartment}</p>
                <p className="mt-1 text-xs text-zinc-500">Not assignable</p>
              </div>
            );
          }

          const med = byCompartment.get(compartment);
          if (!med) {
            return (
              <div
                key={compartment}
                className="flex min-h-28 flex-col items-center justify-center rounded border border-dashed border-zinc-300 bg-zinc-50 px-2 py-3 text-center"
              >
                <p className="text-xs text-zinc-400">Empty</p>
                <p className="mt-1 text-sm font-medium text-zinc-500">#{compartment}</p>
              </div>
            );
          }

          const slug = encodeURIComponent(med.brandName);
          return (
            <Link
              key={compartment}
              href={`/drugs/${slug}`}
              className="flex min-h-28 flex-col justify-between rounded border border-zinc-300 bg-white px-2 py-3 transition-colors hover:border-teal-400"
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs font-semibold text-zinc-500">#{compartment}</p>
                <ProductTypeBadge productType={med.productType} />
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-zinc-900">
                {med.brandName}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
