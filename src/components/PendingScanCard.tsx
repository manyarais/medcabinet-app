"use client";

// Review card for a freshly scanned bottle: label photos on top, extracted
// fields below as editable inputs (AI-uncertain values highlighted), then
// confirm-and-assign / save-without-compartment / discard.

import { useRouter } from "next/navigation";
import { useState } from "react";

export type PendingScanMed = {
  id: number;
  brandName: string;
  genericName: string | null;
  dosage: string | null;
  form: string | null;
  expirationDate: string | null;
  personName: string | null;
  prescriber: string | null;
  pharmacy: string | null;
  rxNumber: string | null;
  refills: string | null;
  rawLabelText: string | null;
  photos: string[];
};

export type IngredientWarning = {
  ingredient: string;
  otherNames: string[];
};

const FIELDS: Array<{ key: keyof FieldValues; label: string }> = [
  { key: "brandName", label: "Name" },
  { key: "genericName", label: "Generic / active ingredient" },
  { key: "dosage", label: "Strength / dosage" },
  { key: "form", label: "Form" },
  { key: "expirationDate", label: "Expiration" },
  { key: "personName", label: "Belongs to (blank = Household)" },
  { key: "prescriber", label: "Prescriber" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "rxNumber", label: "Rx number" },
  { key: "refills", label: "Refills" },
];

type FieldValues = {
  brandName: string;
  genericName: string;
  dosage: string;
  form: string;
  expirationDate: string;
  personName: string;
  prescriber: string;
  pharmacy: string;
  rxNumber: string;
  refills: string;
};

export function PendingScanCard({
  med,
  warnings,
}: {
  med: PendingScanMed;
  warnings: IngredientWarning[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<FieldValues>({
    brandName: med.brandName ?? "",
    genericName: med.genericName ?? "",
    dosage: med.dosage ?? "",
    form: med.form ?? "",
    expirationDate: med.expirationDate ?? "",
    personName: med.personName ?? "",
    prescriber: med.prescriber ?? "",
    pharmacy: med.pharmacy ?? "",
    rxNumber: med.rxNumber ?? "",
    refills: med.refills ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function confirm(assign: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/scan/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: med.id, assign, fields: values }),
      });
      const data = (await response.json()) as {
        compartment?: number | null;
        error?: string;
      };
      if (!response.ok) {
        setMessage(data.error ?? "Confirm failed.");
        return;
      }
      if (assign && data.compartment != null) {
        setMessage(`Saved — put the bottle in compartment ${data.compartment} (flashing).`);
      } else if (assign) {
        setMessage("Saved to the library — the cabinet is full, so no compartment.");
      } else {
        setMessage("Saved to the library without a compartment.");
      }
      router.refresh();
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    setBusy(true);
    try {
      await fetch(`/api/cabinet/${med.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border-2 border-amber-300 bg-amber-50/40 p-4">
      <p className="text-sm font-semibold text-amber-900">
        Review this scan — check the fields against the photos, fix anything
        the AI got wrong, then confirm.
      </p>

      {med.photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {med.photos.map((src) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={src}
              src={src}
              alt="Scanned label"
              className="h-28 w-28 shrink-0 rounded border border-zinc-300 object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FIELDS.map(({ key, label }) => {
          const uncertain = values[key].includes("[?]");
          return (
            <label key={key} className="flex flex-col gap-0.5 text-xs text-zinc-600">
              <span>
                {label}
                {uncertain && (
                  <span className="ml-1 font-semibold text-amber-700">
                    — AI was unsure, please check
                  </span>
                )}
              </span>
              <input
                value={values[key]}
                onChange={(event) =>
                  setValues((v) => ({ ...v, [key]: event.target.value }))
                }
                className={`rounded border px-2 py-1.5 text-sm text-zinc-900 ${
                  uncertain
                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-400"
                    : "border-zinc-300 bg-white"
                }`}
              />
            </label>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 rounded border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          <p className="font-semibold">Shared active ingredients (informational):</p>
          {warnings.map((w) => (
            <p key={w.ingredient}>
              Contains <span className="font-medium">{w.ingredient}</span> — also in{" "}
              {w.otherNames.join(", ")}. Check labels or ask a pharmacist before
              combining products with the same ingredient.
            </p>
          ))}
        </div>
      )}

      {med.rawLabelText && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-500">
            Full text the AI read
          </summary>
          <pre className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">
            {med.rawLabelText}
          </pre>
        </details>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => confirm(true)}
          disabled={busy}
          className="flex-1 rounded bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          ✓ Confirm & assign a compartment
        </button>
        <button
          onClick={() => confirm(false)}
          disabled={busy}
          className="flex-1 rounded border border-zinc-400 px-4 py-2.5 text-sm font-semibold text-zinc-800 disabled:opacity-50"
        >
          Save without compartment
        </button>
        <button
          onClick={discard}
          disabled={busy}
          className="rounded border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
        >
          Discard
        </button>
      </div>

      {message && (
        <p className="mt-2 text-sm text-zinc-800" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
