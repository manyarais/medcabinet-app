"use client";

// Edit + remove actions for a medication already stored in the cabinet (Phase 2).

import { assignableCompartments } from "@/lib/compartments";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type MedicationFields = {
  id: number;
  brandName: string;
  genericName: string | null;
  dosage: string | null;
  expirationDate: string | null;
  compartment: number | null;
};

type Occupant = { compartment: number; brandName: string; id: number };

type Props = {
  medication: MedicationFields;
  occupied: Occupant[];
};

export function CabinetMedicationActions({ medication, occupied }: Props) {
  const router = useRouter();
  const slots = useMemo(() => assignableCompartments(), []);

  const [isEditing, setIsEditing] = useState(false);
  const [brandName, setBrandName] = useState(medication.brandName);
  const [expirationDate, setExpirationDate] = useState(medication.expirationDate ?? "");
  const [dosage, setDosage] = useState(medication.dosage ?? "");
  const [compartment, setCompartment] = useState(medication.compartment ?? slots[0] ?? 1);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const occupantElsewhere = occupied.find(
    (item) => item.compartment === compartment && item.id !== medication.id,
  );

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (occupantElsewhere) {
      setError(
        `Compartment ${compartment} is already occupied by ${occupantElsewhere.brandName}. Pick another.`,
      );
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/cabinet/${medication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          expirationDate: expirationDate.trim() || null,
          dosage: dosage.trim() || null,
          compartment,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save changes.");
        return;
      }
      setMessage("Saved.");
      setIsEditing(false);
      router.refresh();
    } catch {
      setError("Network error while saving.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove() {
    const confirmed = window.confirm(
      `Remove ${medication.brandName} from the cabinet?`,
    );
    if (!confirmed) return;

    setIsRemoving(true);
    setError(null);
    try {
      const response = await fetch(`/api/cabinet/${medication.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not remove medication.");
        return;
      }
      router.push("/cabinet");
      router.refresh();
    } catch {
      setError("Network error while removing.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setIsEditing((open) => !open);
            setError(null);
            setMessage(null);
          }}
          className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium"
        >
          {isEditing ? "Cancel edit" : "Edit"}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          className="rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-800 disabled:opacity-50"
        >
          {isRemoving ? "Removing…" : "Remove from cabinet"}
        </button>
      </div>

      {message && <p className="text-sm text-teal-800">{message}</p>}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {isEditing && (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Name</span>
            <input
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              className="rounded border border-zinc-300 px-2 py-2"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Expiration date</span>
            <input
              value={expirationDate}
              onChange={(event) => setExpirationDate(event.target.value)}
              placeholder="e.g. 2027-03"
              className="rounded border border-zinc-300 px-2 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Dosage</span>
            <textarea
              value={dosage}
              onChange={(event) => setDosage(event.target.value)}
              rows={3}
              className="rounded border border-zinc-300 px-2 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Compartment</span>
            <select
              value={compartment}
              onChange={(event) => setCompartment(Number(event.target.value))}
              className="rounded border border-zinc-300 px-2 py-2"
            >
              {slots.map((n) => {
                const other = occupied.find(
                  (item) => item.compartment === n && item.id !== medication.id,
                );
                return (
                  <option key={n} value={n}>
                    {n}
                    {other
                      ? ` — occupied by ${other.brandName}`
                      : n === medication.compartment
                        ? " — current"
                        : " — empty"}
                  </option>
                );
              })}
            </select>
          </label>

          {occupantElsewhere && (
            <p className="text-sm text-amber-800">
              Compartment {compartment} is taken by {occupantElsewhere.brandName}. Pick another.
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving || Boolean(occupantElsewhere)}
            className="rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </div>
  );
}
