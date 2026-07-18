"use client";

// "Mark disposed" with a two-tap confirm (no accidental disposals).

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DisposeButton({ medicationId }: { medicationId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function dispose() {
    setBusy(true);
    try {
      await fetch("/api/expiry/dispose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: medicationId }),
      });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700"
      >
        Mark disposed
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <button
        onClick={dispose}
        disabled={busy}
        className="rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? "…" : "Yes, disposed"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="rounded border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600"
      >
        Cancel
      </button>
    </span>
  );
}
