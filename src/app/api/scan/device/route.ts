// POST /api/scan/device — trigger a full scan on the ESP32 scanner hardware.
// Slow endpoint (~45s): the device takes 6 photos while its servo turntable
// rotates the bottle, then an AI vision model reads the label. The parsed
// result is saved through the same intake path as POST /api/scan.

import { logActivity } from "@/lib/activity";
import { saveScanPhotos } from "@/lib/scanPhotos";
import { intakeScan, notifyScanDone, parseTranscript, runDeviceScan } from "@/lib/scanner";
import { NextResponse } from "next/server";

export async function POST() {
  let transcript: string;
  let deviceUrl: string;
  let photos: Buffer[];
  try {
    ({ transcript, deviceUrl, photos } = await runDeviceScan());
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
    const photoUrls = await saveScanPhotos(photos).catch(() => [] as string[]);
    const result = await intakeScan(fields, photoUrls);
    // Rescan of a known bottle: flash its home compartment right away. New
    // bottles wait for user confirmation before getting a compartment.
    if (result.updatedExisting) {
      void notifyScanDone(deviceUrl, result.medication.compartment);
    }
    void logActivity("scan_saved", {
      medicationId: result.medication.id,
      detail: `hardware scan: ${result.medication.brandName}`,
    });
    return NextResponse.json({
      medication: result.medication,
      matched: result.matched,
      updatedExisting: result.updatedExisting,
      pendingReview: !result.updatedExisting,
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
