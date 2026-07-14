// GET /api/drugs/search?q= — medication search endpoint (Phase 1).
// Flow: RxNorm normalize → openFDA label → JSON results for the UI.

import { lookupDrugs } from "@/lib/drugs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json(
      { error: "Missing search query. Use ?q=medication-name" },
      { status: 400 },
    );
  }

  try {
    const data = await lookupDrugs(query);
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
