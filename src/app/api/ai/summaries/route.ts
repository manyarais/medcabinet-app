// GET  /api/ai/summaries — most recent caregiver summary (if any).
// POST /api/ai/summaries — generate a new one. Body: { period?: "DAILY" | "WEEKLY" }

import { prisma } from "@/lib/db";
import { generateSummary, type SummaryPeriod, type SummarySection } from "@/lib/ai/summaries";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const row = await prisma.caregiverSummary.findFirst({ orderBy: { createdAt: "desc" } });
  if (!row) return NextResponse.json({ summary: null });
  let sections: SummarySection[] = [];
  try {
    sections = JSON.parse(row.sections) as SummarySection[];
  } catch {
    // corrupted row — treat as absent
    return NextResponse.json({ summary: null });
  }
  return NextResponse.json({
    summary: {
      summary_id: row.id,
      period: row.period,
      headline: row.headline,
      sections,
      generated_at: row.createdAt.toISOString(),
      model_version: row.modelVersion,
    },
  });
}

export async function POST(request: NextRequest) {
  let period: SummaryPeriod = "DAILY";
  try {
    const body = (await request.json()) as { period?: string };
    if (body.period === "WEEKLY") period = "WEEKLY";
    else if (body.period === "ON_DEMAND") period = "ON_DEMAND";
  } catch {
    // default DAILY
  }
  try {
    const summary = await generateSummary(period);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summary generation failed:", error);
    return NextResponse.json({ error: "Could not generate the summary." }, { status: 500 });
  }
}
