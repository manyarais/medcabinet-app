"use client";

// One-button reset to the demo starting state — wipes everything, so it
// double-confirms.

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DemoResetButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reset() {
    setBusy(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      setMessage(
        res.ok
          ? "Reset — 4 demo medications in compartments 1–4, compartment 5 free for a live scan."
          : "Reset failed.",
      );
      router.refresh();
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Demo reset</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Deletes ALL medications, schedules, and history, then loads the demo
        starting state (4 meds in compartments 1–4).
      </p>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="mt-2 rounded border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700"
        >
          Reset to demo state…
        </button>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            onClick={reset}
            disabled={busy}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Resetting…" : "Yes — wipe everything and reset"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600"
          >
            Cancel
          </button>
        </div>
      )}
      {message && <p className="mt-2 text-sm text-zinc-800">{message}</p>}
    </div>
  );
}
