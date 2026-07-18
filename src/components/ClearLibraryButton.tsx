"use client";

// Clears every scanned medication (all person libraries) after confirming.
// Cabinet medications added by hand are not affected.

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClearLibraryButton() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  async function handleClear() {
    if (!confirm("Delete every scanned medication from all libraries?")) return;
    setIsClearing(true);
    try {
      await fetch("/api/scan", { method: "DELETE" });
      router.refresh();
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <button
      onClick={handleClear}
      disabled={isClearing}
      className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
    >
      {isClearing ? "Clearing…" : "Clear libraries"}
    </button>
  );
}
