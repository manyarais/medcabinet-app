// Travel & appointment mode: pick medications to take along, blink their
// compartments to collect them, and restore everything afterward.

import { TravelPacker } from "@/components/TravelPacker";
import { PageHeader } from "@/components/ui/PageHeader";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TravelPage() {
  const meds = await prisma.medication.findMany({
    where: { status: "active" },
    orderBy: { brandName: "asc" },
    select: {
      id: true,
      brandName: true,
      personName: true,
      compartment: true,
      outOfCabinet: true,
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Travel"
        subtitle="Pick what to bring — bays blink so you can grab bottles."
      />
      <TravelPacker meds={meds} />
    </main>
  );
}
