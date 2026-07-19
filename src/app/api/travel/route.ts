// POST /api/travel — pack medications for a trip (marks them away and blinks
// each one's compartment so they're easy to collect), or bring them back.
// Body: { action: "pack" | "return", ids: number[] }

import { logActivity } from "@/lib/activity";
import { flashCompartment } from "@/lib/cabinetBoard";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let action: string;
  let ids: number[];
  try {
    const body = (await request.json()) as { action?: string; ids?: unknown };
    action = body.action ?? "";
    ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isInteger) : [];
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  if ((action !== "pack" && action !== "return") || ids.length === 0) {
    return NextResponse.json(
      { error: 'Send { action: "pack" | "return", ids: [...] }.' },
      { status: 400 },
    );
  }

  const meds = await prisma.medication.findMany({
    where: { id: { in: ids }, status: "active" },
  });
  if (meds.length === 0) {
    return NextResponse.json({ error: "No matching medications." }, { status: 404 });
  }

  const packing = action === "pack";
  await prisma.medication.updateMany({
    where: { id: { in: meds.map((m) => m.id) } },
    data: packing
      ? { outOfCabinet: true, outSince: new Date() }
      : { outOfCabinet: false, outSince: null },
  });

  const flashed: number[] = [];
  for (const med of meds) {
    void logActivity(packing ? "travel_pack" : "travel_return", {
      medicationId: med.id,
      compartment: med.compartment,
      detail: med.brandName,
    });
    if (packing && med.compartment != null) {
      // Sequentially blink each compartment being packed.
      if (await flashCompartment(med.compartment)) flashed.push(med.compartment);
    }
  }

  return NextResponse.json({
    ok: true,
    count: meds.length,
    flashedCompartments: flashed,
  });
}
