// GET /api/drugs/search?q= — medication search endpoint (Phase 1).
// Flow: RxNorm normalize → openFDA label → JSON results for the UI.
// Optional ?limit= (max 25) for UI product dedupe; default 10 keeps prior behavior.

import { lookupDrugs } from "@/lib/drugs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit =
    Number.isInteger(limitParam) && limitParam > 0
      ? Math.min(limitParam, 25)
      : 10;

  if (!query) {
    return NextResponse.json(
      { error: "Missing search query. Use ?q=medication-name" },
      { status: 400 },
    );
  }

  try {
    const data = await lookupDrugs(query, { limit });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Drug search failed:", error);
    return NextResponse.json(
      {
        error: "Drug search failed. Please try again.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
