// Cabinet grid — 8 bays matching physical light strips.

import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { CabinetOutToggleButton } from "@/components/CabinetOutToggleButton";
import { CabinetJumpSearch } from "@/components/CabinetJumpSearch";
import { FlashCompartmentButton } from "@/components/FlashCompartmentButton";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { COMPARTMENTS, type CompartmentConfig } from "@/lib/compartments";
import { prisma } from "@/lib/db";
import { effectiveExpiryForMedication, type ExpiryStatus } from "@/lib/expiration";
import { getHousehold } from "@/lib/household";
import Link from "next/link";

export const dynamic = "force-dynamic";

type MedInCell = {
  id: number;
  brandName: string;
  productType: string;
  outOfCabinet: boolean;
  expiry: ExpiryStatus;
};

export default async function CabinetPage() {
  const household = await getHousehold();
  const medications = await prisma.medication.findMany({
    where: { householdId: household.id, status: "active" },
    include: { prescriptions: { select: { endDate: true } } },
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
          expiry: effectiveExpiryForMedication({
            expirationDate: med.expirationDate,
            productType: med.productType,
            prescriptionEndDates: med.prescriptions.map((rx) => rx.endDate),
          }).status,
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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Cabinet"
        subtitle="8 compartments — lights match the physical bays."
      />

      {outCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-[var(--warning-bg)] px-4 py-3">
          <Badge tone="out" />
          <p className="text-sm font-medium text-[var(--warning-text)]">
            {outCount} out of cabinet
          </p>
        </div>
      )}

      <CabinetJumpSearch medications={jumpMeds} />

      <div className="grid grid-cols-2 gap-3">
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
      ? "bg-[var(--primary)]"
      : state === "out"
        ? "bg-[var(--warning)]"
        : "bg-[var(--danger)]/70";
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
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
      <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] px-3 py-4 text-center shadow-[var(--shadow-soft)]">
        <LightDot state="empty" />
        <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text-secondary)]">
          {config.number}
        </p>
        <p className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">Empty</p>
      </div>
    );
  }

  const slug = encodeURIComponent(med.brandName);
  const shell = med.outOfCabinet
    ? "bg-[var(--warning-bg)] ring-1 ring-[var(--warning)]/25"
    : "bg-[var(--surface)]";

  return (
    <div
      className={`flex min-h-32 flex-col justify-between rounded-2xl border border-[var(--border)]/60 px-3 py-3 shadow-[var(--shadow-soft)] transition duration-150 ease-out active:scale-[0.98] ${shell}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="flex items-center gap-1.5 text-xs font-bold tabular-nums text-[var(--text-secondary)]">
          <LightDot state={med.outOfCabinet ? "out" : "full"} />
          {config.number}
        </p>
        <div className="flex flex-col items-end gap-1">
          {med.outOfCabinet && <Badge tone="out" />}
          {med.expiry === "expired" && (
            <span className="rounded-full bg-[var(--danger-bg)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--danger-text)]">
              Expired
            </span>
          )}
          {med.expiry === "soon" && (
            <span className="rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--warning-text)]">
              Soon
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link
          href={`/drugs/${slug}`}
          className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-[var(--text-primary)] transition duration-150 active:opacity-70"
        >
          {med.brandName}
        </Link>
        <ProductTypeBadge productType={med.productType} />
      </div>
      <div className="mt-2.5 flex items-stretch gap-1.5">
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
