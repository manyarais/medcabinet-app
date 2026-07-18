"use client";

// Scan a bottle with the phone (or laptop) camera — no hardware needed.
// The user takes a few photos, rotating the bottle by hand between shots,
// then the server reads the label with the same AI pipeline as the hardware
// scanner and the cabinet flashes the assigned compartment.
//
// Uses <input capture> (the native camera app) instead of getUserMedia, so it
// works over plain http:// on the LAN — browsers only allow live camera
// streams on secure origins.

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const TARGET_PHOTOS = 4;
const MAX_PHOTOS = 6;
// Downscale before upload: gpt-4o resizes to ~768p anyway, and a full-res
// phone photo would make the JSON payload huge.
const MAX_DIMENSION = 1280;

const SHOT_HINTS = [
  "Label facing the camera",
  "Rotate the bottle a quarter turn",
  "Rotate again — halfway around now",
  "Last quarter — almost done",
  "Extra angle (optional)",
  "Extra angle (optional)",
];

type ScanResponse = {
  medication?: {
    brandName: string;
    personName: string | null;
    compartment: number | null;
  };
  updatedExisting?: boolean;
  error?: string;
};

async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function PhoneScanForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
        added.push(await fileToDataUrl(file));
      }
      setPhotos((current) => [...current, ...added].slice(0, MAX_PHOTOS));
      setMessage(null);
      setIsError(false);
    } catch {
      setIsError(true);
      setMessage("Couldn't read that photo — try taking it again.");
    }
    // Allow re-capturing into the same input.
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setIsReading(true);
    setIsError(false);
    setMessage("AI is reading the label from your photos…");

    try {
      const response = await fetch("/api/scan/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      const data = (await response.json()) as ScanResponse;

      if (!response.ok || !data.medication) {
        setIsError(true);
        setMessage(data.error ?? "Scan failed. Try again.");
        return;
      }

      const person = data.medication.personName ?? "Household";
      const spot =
        data.medication.compartment != null
          ? ` Put it in compartment ${data.medication.compartment} — its light is flashing.`
          : " The cabinet is full, so it's saved without a compartment.";
      setMessage(
        (data.updatedExisting
          ? `Updated ${data.medication.brandName} in ${person}'s library.`
          : `Added ${data.medication.brandName} to ${person}'s library.`) + spot,
      );
      setPhotos([]);
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Network error — is the app still running?");
    } finally {
      setIsReading(false);
    }
  }

  const nextHint = SHOT_HINTS[Math.min(photos.length, SHOT_HINTS.length - 1)];

  return (
    <div className="mt-3 flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-600">
        No hardware? Scan with this device&apos;s camera: take {TARGET_PHOTOS}{" "}
        photos, rotating the bottle between shots so every side of the label
        gets seen.
      </p>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={`Bottle photo ${index + 1}`}
                className="h-16 w-16 rounded border border-zinc-300 object-cover"
              />
              <button
                onClick={() => removePhoto(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFile(event.target.files)}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        {photos.length < MAX_PHOTOS && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isReading}
            className="flex-1 rounded border border-zinc-900 px-4 py-3 text-base font-semibold text-zinc-900 disabled:opacity-50"
          >
            📱 Photo {photos.length + 1}: {nextHint}
          </button>
        )}
        {photos.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={isReading}
            className="flex-1 rounded bg-zinc-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            {isReading
              ? "Reading label…"
              : `Read label (${photos.length} photo${photos.length === 1 ? "" : "s"})`}
          </button>
        )}
      </div>

      {message && (
        <p
          className={`text-sm ${isError ? "text-red-700" : "text-zinc-800"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
