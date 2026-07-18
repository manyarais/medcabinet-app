// GET /api/cabinet/search?q= — local "do I have this?" matches (active meds only).
// Instant path for home search; does not call openFDA.

import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export type CabinetSearchHit = {
  id: number;
  brandName: string;
  genericName: string | null;
  productType: string;
  purpose: string | null;
  compartment: number | null;
  outOfCabinet: boolean;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json(
      { error: "Missing search query. Use ?q=medication-name" },
      { status: 400 },
    );
  }

  const needle = query.toLowerCase();
  const medications = await prisma.medication.findMany({
    where: { status: "active" },
    orderBy: { brandName: "asc" },
  });

  const results: CabinetSearchHit[] = medications
    .filter((med) => {
      const brand = med.brandName.toLowerCase();
      const generic = med.genericName?.toLowerCase() ?? "";
      return brand.includes(needle) || generic.includes(needle);
    })
    .map((med) => ({
      id: med.id,
      brandName: med.brandName,
      genericName: med.genericName,
      productType: med.productType,
      purpose: med.purpose,
      compartment: med.compartment,
      outOfCabinet: med.outOfCabinet,
    }));

  return NextResponse.json({ query, results });
}
