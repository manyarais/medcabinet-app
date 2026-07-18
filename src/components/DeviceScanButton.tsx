"use client";

// Big "Scan a bottle" button (Phase 4). Kicks off the hardware scan and keeps
// the user informed during the ~45s the turntable + AI read take.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Rough timeline of what the hardware is doing, keyed by seconds elapsed.
// Campus WiFi routes device traffic slowly, so scans there can take ~2 min.
const PHASES: Array<[number, string]> = [
  [0, "Scanning — turntable rotating, taking 6 photos…"],
  [45, "Photos coming in — AI is reading the label…"],
  [100, "Still working — campus WiFi moves photos slowly, hang tight…"],
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

export function DeviceScanButton() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const startedAt = useRef(0);

  // Advance the status message as the scan progresses.
  useEffect(() => {
    if (!isScanning) return;
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      const phase = [...PHASES].reverse().find(([at]) => elapsed >= at);
      if (phase) setMessage(phase[1]);
    }, 1000);
    return () => clearInterval(timer);
  }, [isScanning]);

  async function handleScan() {
    setIsScanning(true);
    setIsError(false);
    startedAt.current = Date.now();
    setMessage(PHASES[0][1]);

    try {
      const response = await fetch("/api/scan/device", { method: "POST" });
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
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Network error — is the app still running?");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-600">
        Put the bottle on the scanner turntable with the label facing the
        camera, then start the scan. It takes about 45 seconds.
      </p>
      <button
        onClick={handleScan}
        disabled={isScanning}
        className="rounded bg-zinc-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
      >
        {isScanning ? "Scanning…" : "📷 Scan a bottle"}
      </button>
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
