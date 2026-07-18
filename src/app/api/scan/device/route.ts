// POST /api/scan/device — trigger a full scan on the ESP32 scanner hardware.
// Slow endpoint (~45s): the device takes 6 photos while its servo turntable
// rotates the bottle, then an AI vision model reads the label. The parsed
// result is saved through the same intake path as POST /api/scan.

import { intakeScan, notifyScanDone, parseTranscript, runDeviceScan } from "@/lib/scanner";
import { NextResponse } from "next/server";

export async function POST() {
  let transcript: string;
  let deviceUrl: string;
  try {
    ({ transcript, deviceUrl } = await runDeviceScan());
  } catch (error) {
    console.error("Device scan failed:", error);
    const message =
      error instanceof Error ? error.message : "Could not reach the scanner.";
    return NextResponse.json(
      { error: `${message} Is the scanner powered on and on the same WiFi?` },
      { status: 502 },
    );
  }

  const fields = parseTranscript(transcript);
  if (!fields) {
    return NextResponse.json(
      {
        error:
          "The scanner could not read any text on the bottle. Check lighting and distance, then rescan.",
        transcript,
      },
      { status: 422 },
    );
  }

  try {
    const result = await intakeScan(fields);
    // Flash that medicine's compartment strip until its switch is pressed.
    // Fire-and-forget — probing for the cabinet board must not delay the reply.
    void notifyScanDone(deviceUrl);
    return NextResponse.json({
      medication: result.medication,
      matched: result.matched,
      updatedExisting: result.updatedExisting,
      transcript,
    });
  } catch (error) {
    console.error("Scan intake failed:", error);
    return NextResponse.json(
      { error: "Scan worked but saving to the database failed." },
      { status: 500 },
    );
  }
}
