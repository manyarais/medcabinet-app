// GET /api/symptoms/history — recent symptom "I took this" logs (symptom not null).

import { prisma } from "@/lib/db";
import { getHousehold } from "@/lib/household";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const household = await getHousehold();
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit =
    Number.isInteger(limitParam) && limitParam > 0
      ? Math.min(limitParam, 50)
      : 20;

  const logs = await prisma.usageLog.findMany({
    where: {
      householdId: household.id,
      symptom: { not: null },
    },
    include: { medication: true },
    orderBy: { takenAt: "desc" },
    take: limit,
  });

  // Prescription calendar doses use symptom: null — exclude those from this feed.
  const entries = logs
    .filter((log) => (log.symptom ?? "").trim().length > 0)
    .map((log) => ({
      id: log.id,
      medicationId: log.medicationId,
      brandName: log.medication?.brandName ?? "Removed medication",
      compartment: log.medication?.compartment ?? null,
      productType: log.medication?.productType ?? "UNKNOWN",
      symptom: log.symptom,
      takenAt: log.takenAt.toISOString(),
    }));

  return NextResponse.json({ entries });
}
