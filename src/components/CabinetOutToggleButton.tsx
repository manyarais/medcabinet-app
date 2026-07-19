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
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isSaving}
        aria-label={`${outOfCabinet ? "Put back" : "Take out"} ${brandName}`}
        className={`inline-flex min-h-8 w-full items-center justify-center rounded-full px-2.5 text-[11px] font-semibold transition duration-150 active:scale-95 disabled:opacity-50 ${
          outOfCabinet
            ? "bg-[var(--primary)] text-[var(--text-on-primary)]"
            : "bg-[var(--accent-cream)] text-[var(--text-primary)]"
        }`}
      >
        {isSaving ? "…" : outOfCabinet ? "Put back" : "Take out"}
      </button>
      {error && (
        <p className="text-[10px] leading-tight text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
