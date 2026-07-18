// Cabinet grid page.
// One 8-bay unit, numbered 1–8 to match the physical light strips:
// red = empty (strip solid red), green = full (strip solid green).

import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { CabinetOutToggleButton } from "@/components/CabinetOutToggleButton";
import { CabinetJumpSearch } from "@/components/CabinetJumpSearch";
import { FlashCompartmentButton } from "@/components/FlashCompartmentButton";
import { COMPARTMENTS, type CompartmentConfig } from "@/lib/compartments";
import { prisma } from "@/lib/db";
import { expiryStatusFor, type ExpiryStatus } from "@/lib/expiration";
import Link from "next/link";

type MedInCell = {
  id: number;
  brandName: string;
  productType: string;
  outOfCabinet: boolean;
  expiry: ExpiryStatus;
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
          expiry: expiryStatusFor(med.expirationDate),
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
          8 compartments, numbered to match the cabinet lights. Scanned bottles
          fill the lowest free slot — the flashing strip shows where to put them.
        </p>
      </header>

      <CabinetJumpSearch medications={jumpMeds} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COMPARTMENTS.map((cell) => (
          <CompartmentCell
            key={cell.number}
            config={cell}
            med={byCompartment.get(cell.number)}
          />
        ))}
      </div>
    </main>
  );
}

function LightDot({ state }: { state: "empty" | "full" | "out" }) {
  const color =
    state === "full"
      ? "bg-emerald-500"
      : state === "out"
        ? "bg-amber-500"
        : "bg-red-400";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
      aria-hidden
    />
  );
}

function CompartmentCell({
  config,
  med,
}: {
  config: CompartmentConfig;
  med: MedInCell | undefined;
}) {
  if (!med) {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center rounded border border-dashed border-red-200 bg-red-50/50 px-2 py-3 text-center">
        <LightDot state="empty" />
        <p className="mt-1 text-lg font-bold text-zinc-500">#{config.number}</p>
        <p className="mt-0.5 text-xs text-zinc-400">Empty</p>
      </div>
    );
  }

  const slug = encodeURIComponent(med.brandName);
  const cellClassName = med.outOfCabinet
    ? "flex min-h-28 flex-col justify-between rounded border-2 border-dashed border-amber-400 bg-amber-50/60 px-2 py-3 opacity-75"
    : "flex min-h-28 flex-col justify-between rounded border border-emerald-300 bg-emerald-50/60 px-2 py-3 transition-colors hover:border-emerald-500";
  return (
    <div className={cellClassName}>
      <div className="flex items-start justify-between gap-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
          <LightDot state={med.outOfCabinet ? "out" : "full"} />#{config.number}
        </p>
        <div className="flex flex-col items-end gap-1">
          {med.outOfCabinet && (
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              OUT
            </span>
          )}
          {med.expiry === "expired" && (
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              EXPIRED
            </span>
          )}
          {med.expiry === "soon" && (
            <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
              EXPIRES SOON
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
      <div className="mt-1.5 flex items-center gap-1.5">
        <FlashCompartmentButton compartment={config.number} />
        <CabinetOutToggleButton
          medicationId={med.id}
          brandName={med.brandName}
          outOfCabinet={med.outOfCabinet}
        />
      </div>
    </div>
  );
}
