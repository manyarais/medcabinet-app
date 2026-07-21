"use client";

// Calendar page — schedule a reminder for a medication already in the cabinet.

import { ReconnectHint } from "@/components/ReconnectHint";
import { useOffline } from "@/components/OfflineProvider";
import { todayLocal } from "@/lib/dates";
import { defaultDoseTimes } from "@/lib/doseTimes";
import { RECONNECT_TO_CHANGE } from "@/lib/offline";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type CabinetMed = {
  id: number;
  brandName: string;
  compartment: number | null;
  productType: string;
  status: string;
};

type Props = {
  onSaved?: () => void;
};

function medLabel(med: CabinetMed) {
  const bay =
    med.compartment != null ? `Bay ${med.compartment}` : "No bay";
  return `${bay} · ${med.brandName}`;
}

export function AddCalendarScheduleForm({ onSaved }: Props) {
  const { online } = useOffline();
  const today = todayLocal();
  const [open, setOpen] = useState(false);
  const [meds, setMeds] = useState<CabinetMed[]>([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [medicationId, setMedicationId] = useState("");
  const [dosesPerDay, setDosesPerDay] = useState(1);
  const [doseTimes, setDoseTimes] = useState(() => defaultDoseTimes(1));
  const [pillsPerDose, setPillsPerDose] = useState("1");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMedsLoading(true);
    void fetch("/api/cabinet")
      .then(async (response) => {
        const data = (await response.json()) as {
          medications?: CabinetMed[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Could not load cabinet.");
        }
        const active = (data.medications ?? [])
          .filter((med) => med.status === "active")
          .sort((a, b) => {
            const ac = a.compartment ?? 999;
            const bc = b.compartment ?? 999;
            if (ac !== bc) return ac - bc;
            return a.brandName.localeCompare(b.brandName);
          });
        if (!cancelled) setMeds(active);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load cabinet.",
          );
          setMeds([]);
        }
      })
      .finally(() => {
        if (!cancelled) setMedsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleDosesPerDayChange(value: string) {
    if (value.trim() === "") return;
    const n = Number(value);
    if (!Number.isInteger(n)) return;
    const clamped = Math.min(12, Math.max(1, n));
    setDosesPerDay(clamped);
    setDoseTimes((prev) => {
      const next = defaultDoseTimes(clamped);
      return next.map((fallback, i) => prev[i] ?? fallback);
    });
  }

  function handleDoseTimeChange(index: number, value: string) {
    setDoseTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!navigator.onLine) {
      setError(RECONNECT_TO_CHANGE);
      return;
    }

    const id = Number(medicationId);
    if (!Number.isInteger(id) || id < 1) {
      setError("Select a medication from your cabinet.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/calendar/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: id,
          dosesPerDay,
          pillsPerDose: Number(pillsPerDose),
          doseTimes,
          startDate,
          endDate,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        brandName?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not save schedule.");
        return;
      }
      const name =
        data.brandName ??
        meds.find((med) => med.id === id)?.brandName ??
        "medication";
      setMessage(`Schedule added for “${name}”.`);
      setMedicationId("");
      setDosesPerDay(1);
      setDoseTimes(defaultDoseTimes(1));
      setPillsPerDose("1");
      setStartDate(today);
      onSaved?.();
    } catch {
      setError("Network error while saving schedule.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition duration-150 active:bg-[var(--surface-tint)]"
        aria-expanded={open}
      >
        <div>
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">
            Add something to remember
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Pick a cabinet module and set dose times
          </p>
        </div>
        <span className="text-lg font-semibold text-[var(--primary)]" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 border-t border-[var(--border)]/60 px-4 pb-4 pt-3"
        >
          {!online && <ReconnectHint />}
          <p className="text-xs text-[var(--text-secondary)]">
            Reminder only — this app does not advise on dosing.
          </p>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--text-primary)]">
              Cabinet medication
            </span>
            {medsLoading ? (
              <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
            ) : meds.length === 0 ? (
              <p className="rounded-xl bg-[var(--accent-cream)] px-3 py-3 text-sm text-[var(--text-secondary)]">
                No medications in your cabinet yet.{" "}
                <Link href="/cabinet" className="font-semibold text-[var(--primary)]">
                  Open cabinet
                </Link>{" "}
                or scan one in first.
              </p>
            ) : (
              <select
                value={medicationId}
                onChange={(event) => setMedicationId(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/25"
                required
              >
                <option value="">Select a module…</option>
                {meds.map((med) => (
                  <option key={med.id} value={med.id}>
                    {medLabel(med)}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--text-primary)]">Pills per dose</span>
            <input
              type="number"
              min={1}
              max={20}
              value={pillsPerDose}
              onChange={(event) => setPillsPerDose(event.target.value)}
              className="rounded-xl border border-[var(--border)] px-3 py-2.5"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--text-primary)]">Doses per day</span>
            <input
              type="number"
              min={1}
              max={12}
              value={dosesPerDay}
              onChange={(event) => handleDosesPerDayChange(event.target.value)}
              className="rounded-xl border border-[var(--border)] px-3 py-2.5"
              required
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-[var(--text-primary)]">
              Dose times
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {doseTimes.map((time, index) => (
                <label key={index} className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-[var(--text-secondary)]">
                    Dose {index + 1}
                  </span>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) =>
                      handleDoseTimeChange(index, event.target.value)
                    }
                    className="rounded-xl border border-[var(--border)] px-3 py-2.5"
                    required
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--text-primary)]">Start</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="rounded-xl border border-[var(--border)] px-3 py-2.5"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--text-primary)]">End</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="rounded-xl border border-[var(--border)] px-3 py-2.5"
                required
              />
            </label>
          </div>

          {error && (
            <p className="text-sm text-[var(--danger-text)]" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm font-medium text-[var(--primary)]">{message}</p>
          )}

          <button
            type="submit"
            disabled={!online || isSaving || !medicationId || meds.length === 0}
            className="btn-primary-fill min-h-11 rounded-2xl text-sm font-semibold disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Add to calendar"}
          </button>
        </form>
      )}
    </section>
  );
}
