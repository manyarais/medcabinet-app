// GET /api/ai/scan-sessions/[id] — progress view for the active scan UI:
// field checklist, completion, last planner action, final medication id.

import { getScanSessionView } from "@/lib/ai/activeScan";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const view = await getScanSessionView(id);
  if (!view) {
    return NextResponse.json({ error: "Scan session not found." }, { status: 404 });
  }
  return NextResponse.json(view);
}
