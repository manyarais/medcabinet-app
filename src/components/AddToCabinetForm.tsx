"use client";

// Add-to-cabinet form on the medication detail page (Phase 2).
// Warns when the chosen compartment is already occupied; never overwrites.

import { ReconnectHint } from "@/components/ReconnectHint";
import { useOffline } from "@/components/OfflineProvider";
import { assignableCompartments, getCompartmentConfig } from "@/lib/compartments";
import { RECONNECT_TO_CHANGE } from "@/lib/offline";
import type { DrugResult } from "@/lib/types";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type Occupant = { compartment: number; brandName: string };

type Props = {
  drug: DrugResult;
  occupied: Occupant[];
};

export function AddToCabinetForm({ drug, occupied }: Props) {
  const { online } = useOffline();
  const router = useRouter();
  const slots = useMemo(() => assignableCompartments(), []);
  const occupiedMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of occupied) {
      map.set(item.compartment, item.brandName);
    }
    return map;
  }, [occupied]);

  const firstFree = slots.find((n) => !occupiedMap.has(n)) ?? slots[0] ?? 1;

  const [compartment, setCompartment] = useState(firstFree);
  const [expirationDate, setExpirationDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const occupantName = occupiedMap.get(compartment) ?? null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!navigator.onLine) {
      setError(RECONNECT_TO_CHANGE);
      return;
    }

    if (occupantName) {
      setError(
        `Compartment ${compartment} is already occupied by ${occupantName}. Pick another.`,
      );
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/cabinet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: drug.brandName,
          genericName: drug.genericName,
          productType: drug.productType,
          indications: drug.indications ?? "",
          purpose: drug.purpose,
          warnings: drug.warnings,
          dosage: drug.dosage,
          expirationDate: expirationDate.trim() || null,
          compartment,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not add to cabinet.");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Network error while saving. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (success) {
    return (
      <p className="rounded border border-[var(--brand-sage)] bg-[var(--brand-sage)]/50 px-3 py-3 text-sm text-zinc-900">
        Added to cabinet — compartment {compartment}.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Add to cabinet</h2>
      {!online && <ReconnectHint />}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Compartment</span>
        <select
          value={compartment}
          onChange={(event) => setCompartment(Number(event.target.value))}
          disabled={!online}
          className="rounded border border-zinc-300 px-2 py-2"
        >
          {slots.map((n) => {
            const takenBy = occupiedMap.get(n);
            const size = getCompartmentConfig(n)?.size ?? "";
            return (
              <option key={n} value={n}>
                {n} ({size})
                {takenBy ? ` — occupied by ${takenBy}` : " — empty"}
              </option>
            );
          })}
        </select>
      </label>

      {occupantName && (
        <p className="text-sm text-amber-800" role="status">
          Compartment {compartment} is taken by {occupantName}. Choose another before saving.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Expiration date (optional)</span>
        <input
          type="text"
          value={expirationDate}
          onChange={(event) => setExpirationDate(event.target.value)}
          placeholder="e.g. 2027-03"
          disabled={!online}
          className="rounded border border-zinc-300 px-2 py-2"
        />
      </label>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!online || isSaving || Boolean(occupantName)}
        className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Save to cabinet"}
      </button>
    </form>
  );
}
