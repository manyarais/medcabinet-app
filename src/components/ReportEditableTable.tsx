"use client";

// Inline edit for medication reconciliation report rows (print hides editors).

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export type ReportMed = {
  id: number;
  brandName: string;
  genericName: string | null;
  productType: string;
  form: string | null;
  dosage: string | null;
  personName: string | null;
  prescriber: string | null;
  pharmacy: string | null;
  rxNumber: string | null;
  expirationDate: string | null;
  compartment: number | null;
  outOfCabinet: boolean;
  expiryLabel: "ok" | "soon" | "expired" | "unknown";
};

type Props = {
  meds: ReportMed[];
};

function locationLabel(med: ReportMed): string {
  if (med.outOfCabinet) return "Out of cabinet";
  if (med.compartment != null) return `Compartment ${med.compartment}`;
  return "Not in cabinet";
}

export function ReportEditableTable({ meds }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-400 text-left text-xs uppercase tracking-wide text-zinc-600">
            <th className="py-2 pr-3">Medication</th>
            <th className="py-2 pr-3">Strength / instructions</th>
            <th className="py-2 pr-3">Belongs to</th>
            <th className="py-2 pr-3">Prescriber / pharmacy</th>
            <th className="py-2 pr-3">Expires</th>
            <th className="py-2 pr-3">Location</th>
            <th className="py-2 print:hidden">Edit</th>
          </tr>
        </thead>
        <tbody>
          {meds.map((med) =>
            editingId === med.id ? (
              <ReportEditRow
                key={med.id}
                med={med}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  router.refresh();
                }}
              />
            ) : (
              <tr key={med.id} className="border-b border-zinc-200 align-top">
                <td className="py-2 pr-3">
                  <span className="font-semibold">{med.brandName}</span>
                  {med.genericName && (
                    <span className="block text-xs text-zinc-500">{med.genericName}</span>
                  )}
                  <span className="block text-xs text-zinc-500">
                    {med.productType}
                    {med.form ? ` · ${med.form}` : ""}
                  </span>
                </td>
                <td className="py-2 pr-3 text-xs">{med.dosage ?? "—"}</td>
                <td className="py-2 pr-3">{med.personName ?? "Household"}</td>
                <td className="py-2 pr-3 text-xs">
                  {[med.prescriber, med.pharmacy].filter(Boolean).join(" / ") || "—"}
                  {med.rxNumber && (
                    <span className="block text-zinc-500">Rx {med.rxNumber}</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  {med.expirationDate ?? "unknown"}
                  {med.expiryLabel === "expired" && (
                    <span className="block text-xs font-bold text-red-700">EXPIRED</span>
                  )}
                </td>
                <td className="py-2 pr-3">{locationLabel(med)}</td>
                <td className="py-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => setEditingId(med.id)}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      {meds.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500">No active medications to list.</p>
      )}
    </div>
  );
}

function ReportEditRow({
  med,
  onCancel,
  onSaved,
}: {
  med: ReportMed;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [brandName, setBrandName] = useState(med.brandName);
  const [genericName, setGenericName] = useState(med.genericName ?? "");
  const [form, setForm] = useState(med.form ?? "");
  const [dosage, setDosage] = useState(med.dosage ?? "");
  const [personName, setPersonName] = useState(med.personName ?? "");
  const [prescriber, setPrescriber] = useState(med.prescriber ?? "");
  const [pharmacy, setPharmacy] = useState(med.pharmacy ?? "");
  const [rxNumber, setRxNumber] = useState(med.rxNumber ?? "");
  const [expirationDate, setExpirationDate] = useState(med.expirationDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/cabinet/${med.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          genericName: genericName.trim() || null,
          form: form.trim() || null,
          dosage: dosage.trim() || null,
          personName: personName.trim() || null,
          prescriber: prescriber.trim() || null,
          pharmacy: pharmacy.trim() || null,
          rxNumber: rxNumber.trim() || null,
          expirationDate: expirationDate.trim() || null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      onSaved();
    } catch {
      setError("Network error while saving.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-900";

  return (
    <tr className="border-b border-zinc-300 bg-zinc-50 align-top print:hidden">
      <td colSpan={7} className="py-3">
        <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-zinc-700">
            Editing report fields for this medication
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-zinc-600">Brand name</span>
              <input
                className={inputClass}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-zinc-600">Generic name</span>
              <input
                className={inputClass}
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-zinc-600">Form</span>
              <input
                className={inputClass}
                value={form}
                onChange={(e) => setForm(e.target.value)}
                placeholder="tablets, capsules…"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-zinc-600">Strength / instructions</span>
              <input
                className={inputClass}
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-zinc-600">Belongs to (blank = Household)</span>
              <input
                className={inputClass}
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-zinc-600">Expires</span>
              <input
                className={inputClass}
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                placeholder="YYYY-MM or YYYY-MM-DD"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-zinc-600">Prescriber</span>
              <input
                className={inputClass}
                value={prescriber}
                onChange={(e) => setPrescriber(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-zinc-600">Pharmacy</span>
              <input
                className={inputClass}
                value={pharmacy}
                onChange={(e) => setPharmacy(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs sm:col-span-2">
              <span className="font-medium text-zinc-600">Rx number</span>
              <input
                className={inputClass}
                value={rxNumber}
                onChange={(e) => setRxNumber(e.target.value)}
              />
            </label>
          </div>
          {error && (
            <p className="text-xs text-red-700" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
            <span className="self-center text-xs text-zinc-500">
              Location stays {locationLabel(med)} (change that on Cabinet).
            </span>
          </div>
        </form>
      </td>
    </tr>
  );
}
