// POST /api/scan/photos — scan a bottle from photos taken with the phone/
// laptop camera (the user rotates the bottle by hand between shots), instead
// of the ESP32 turntable. Same AI read + intake path as the hardware scan,
// including flashing the assigned compartment on the cabinet board.
//
// Body: { photos: string[] } — JPEG data URLs (or raw base64), 1–6 of them,
// already downscaled client-side so the payload stays small.

import { logActivity } from "@/lib/activity";
import { saveScanPhotos } from "@/lib/scanPhotos";
import {
  intakeScan,
  notifyScanDone,
  parseTranscript,
  readPhotosWithOpenAI,
} from "@/lib/scanner";
import { NextRequest, NextResponse } from "next/server";

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // after base64 decode

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Camera scanning needs OPENAI_API_KEY set on the server." },
      { status: 501 },
    );
  }

  let photos: unknown;
  try {
    ({ photos } = (await request.json()) as { photos?: unknown });
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  if (
    !Array.isArray(photos) ||
    photos.length === 0 ||
    photos.length > MAX_PHOTOS ||
    !photos.every((p) => typeof p === "string" && p.length > 0)
  ) {
    return NextResponse.json(
      { error: `Send 1–${MAX_PHOTOS} photos as data URLs.` },
      { status: 400 },
    );
  }

  const buffers: Buffer[] = [];
  for (const photo of photos as string[]) {
    const base64 = photo.startsWith("data:")
      ? photo.slice(photo.indexOf(",") + 1)
      : photo;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      return NextResponse.json({ error: "A photo was not valid base64." }, { status: 400 });
    }
    if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "A photo was empty or too large." },
        { status: 400 },
      );
    }
    buffers.push(buffer);
  }

  let transcript: string;
  try {
    transcript = await readPhotosWithOpenAI(apiKey, buffers);
  } catch (error) {
    console.error("Photo scan AI read failed:", error);
    const message = error instanceof Error ? error.message : "AI read failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const fields = parseTranscript(transcript);
  if (!fields) {
    return NextResponse.json(
      {
        error:
          "Couldn't read any text on the bottle. Get closer, improve the lighting, and keep the label facing the camera.",
        transcript,
      },
      { status: 422 },
    );
  }

  try {
    const photoUrls = await saveScanPhotos(buffers).catch(() => [] as string[]);
    const result = await intakeScan(fields, photoUrls);
    // Rescan of a known bottle: flash its home compartment right away. New
    // bottles wait for user confirmation before getting a compartment.
    if (result.updatedExisting) {
      void notifyScanDone(null, result.medication.compartment);
    }
    void logActivity("scan_saved", {
      medicationId: result.medication.id,
      detail: `camera scan: ${result.medication.brandName}`,
    });
    return NextResponse.json({
      medication: result.medication,
      matched: result.matched,
      updatedExisting: result.updatedExisting,
      pendingReview: !result.updatedExisting,
      transcript,
    });
  } catch (error) {
    console.error("Photo scan intake failed:", error);
    return NextResponse.json(
      { error: "Scan worked but saving to the database failed." },
      { status: 500 },
    );
  }
}
