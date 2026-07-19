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
    <div className="rounded-2xl bg-[var(--warning-bg)] p-4 shadow-[var(--shadow-soft)]">
      <p className="text-sm font-semibold text-[var(--warning-text)]">
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
              className="h-28 w-28 shrink-0 rounded-xl object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FIELDS.map(({ key, label }) => {
          const uncertain = values[key].includes("[?]");
          return (
            <label key={key} className="flex flex-col gap-0.5 text-xs text-[var(--text-secondary)]">
              <span>
                {label}
                {uncertain && (
                  <span className="ml-1 font-semibold text-[var(--warning-text)]">
                    — AI was unsure, please check
                  </span>
                )}
              </span>
              <input
                value={values[key]}
                onChange={(event) =>
                  setValues((v) => ({ ...v, [key]: event.target.value }))
                }
                className={`rounded-xl border-0 px-2.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/25 ${
                  uncertain
                    ? "bg-[var(--surface)] ring-2 ring-[var(--warning)]"
                    : "bg-[var(--surface)]"
                }`}
              />
            </label>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 rounded-2xl bg-[var(--rx-bg)] px-3 py-2.5 text-xs text-[var(--rx-text)]">
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
          <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">
            Full text the AI read
          </summary>
          <pre className="mt-1 whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
            {med.rawLabelText}
          </pre>
        </details>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => confirm(true)}
          disabled={busy}
          className="min-h-11 flex-1 rounded-2xl btn-primary-fill px-4 text-sm font-semibold transition duration-150 ease-out disabled:opacity-50"
        >
          Confirm & assign a bay
        </button>
        <button
          onClick={() => confirm(false)}
          disabled={busy}
          className="min-h-11 flex-1 rounded-2xl bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] transition duration-150 disabled:opacity-50"
        >
          Save without bay
        </button>
        <button
          onClick={discard}
          disabled={busy}
          className="min-h-11 rounded-2xl bg-[var(--danger-bg)] px-4 text-sm font-semibold text-[var(--danger-text)] transition duration-150 disabled:opacity-50"
        >
          Discard
        </button>
      </div>

      {message && (
        <p className="mt-2 text-sm text-[var(--text-primary)]" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
