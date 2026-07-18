"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  medicationId: number;
  brandName: string;
  outOfCabinet: boolean;
};

export function CabinetOutToggleButton({
  medicationId,
  brandName,
  outOfCabinet,
}: Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/cabinet/${medicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outOfCabinet: !outOfCabinet }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not update cabinet status.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error while updating.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isSaving}
        aria-label={`${outOfCabinet ? "Put back" : "Take out"} ${brandName}`}
        className="rounded border border-zinc-300 bg-white/80 px-2 py-1 text-xs font-medium text-zinc-800 disabled:opacity-50"
      >
        {isSaving ? "Saving..." : outOfCabinet ? "Put back" : "Take out"}
      </button>
      {error && (
        <p className="text-[10px] leading-tight text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
