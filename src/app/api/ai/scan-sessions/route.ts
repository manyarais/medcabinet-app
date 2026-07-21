// POST /api/ai/scan-sessions — start an active-vision scan. Returns the
// session id immediately; the capture/analyze/rotate loop runs on the server
// and progress is polled via GET /api/ai/scan-sessions/[id].

import { startScanSession } from "@/lib/ai/activeScan";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const id = await startScanSession();
    return NextResponse.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the scan.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
