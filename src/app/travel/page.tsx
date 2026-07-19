// Travel & appointment mode: pick medications to take along, blink their
// compartments to collect them, and restore everything afterward.

import { TravelPacker } from "@/components/TravelPacker";
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Travel</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Going somewhere? Select what to bring — each compartment blinks so
          you can collect the bottles, and Pillio remembers what&apos;s away
          until you bring it back.
        </p>
      </header>
      <TravelPacker meds={meds} />
    </main>
  );
}
