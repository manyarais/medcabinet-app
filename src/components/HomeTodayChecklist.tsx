"use client";

// Home — today's prescription doses with the same take/untake checkboxes as Calendar.

import { formatDoseTimeDisplay } from "@/lib/doseTimes";
import { todayLocal } from "@/lib/dates";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Dose = {
  prescriptionId: number;
  medicationId: number;
  brandName: string;
  compartment: number | null;
  doseIndex: number;
  absoluteIndex: number;
  dosesPerDay: number;
  pillsPerDose: number;
  scheduledTime: string;
  taken: boolean;
};

type CalendarResponse = {
  date: string;
  isToday: boolean;
  doses: Dose[];
  error?: string;
};

function canUntakeDose(dose: Dose, doses: Dose[]) {
  if (!dose.taken) return false;
  const takenMax = doses
    .filter((d) => d.medicationId === dose.medicationId && d.taken)
    .reduce((max, d) => Math.max(max, d.absoluteIndex), 0);
  return dose.absoluteIndex === takenMax;
}

export function HomeTodayChecklist() {
  const date = todayLocal();
  const [doses, setDoses] = useState<Dose[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/calendar?date=${encodeURIComponent(date)}`);
      const json = (await response.json()) as CalendarResponse;
      if (!response.ok) {
        setError(json.error ?? "Could not load today’s doses.");
        setDoses([]);
        return;
      }
      setDoses(json.doses);
      setError(null);
    } catch {
      setError("Network error loading doses.");
      setDoses([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTake(dose: Dose) {
    if (dose.taken) return;
    const key = `${dose.medicationId}-${dose.prescriptionId}-${dose.doseIndex}`;
    setSavingKey(key);
    setError(null);
    try {
      const response = await fetch("/api/calendar/take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicationId: dose.medicationId, date }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Could not log dose.");
        return;
      }
      await load();
    } catch {
      setError("Network error while logging dose.");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleUntake(dose: Dose) {
    if (!dose.taken) return;
    const key = `${dose.medicationId}-${dose.prescriptionId}-${dose.doseIndex}`;
    setSavingKey(key);
    setError(null);
    try {
      const response = await fetch("/api/calendar/untake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicationId: dose.medicationId, date }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Could not undo dose.");
        return;
      }
      await load();
    } catch {
      setError("Network error while undoing dose.");
    } finally {
      setSavingKey(null);
    }
  }

  const takenCount = doses?.filter((d) => d.taken).length ?? 0;
  const totalCount = doses?.length ?? 0;

  return (
    <section
      className="rounded-2xl border border-[var(--brand-tint)]/50 p-4 shadow-[var(--shadow-soft)]"
      style={{ background: "var(--gradient-today)" }}
      aria-label="Today’s doses"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-[var(--primary)]">
          Today’s doses
        </h2>
        <Link
          href="/calendar"
          className="text-xs font-semibold text-[var(--primary)] transition duration-150 active:opacity-70"
        >
          Calendar
        </Link>
      </div>

      {loading && (
        <p className="mt-3 text-sm text-[var(--text-secondary)]" role="status">
          Loading…
        </p>
      )}

      {error && (
        <p
          className="mt-3 rounded-xl bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]"
          role="alert"
        >
          {error}
        </p>
      )}

      {!loading && doses && doses.length === 0 && (
        <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
          No prescription doses scheduled today.
        </p>
      )}

      {!loading && doses && doses.length > 0 && (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {doses.map((dose) => {
              const key = `${dose.medicationId}-${dose.prescriptionId}-${dose.doseIndex}`;
              const canCheck = !dose.taken;
              const canUntake = canUntakeDose(dose, doses);
              const interactive = canCheck || canUntake;
              return (
                <li
                  key={key}
                  className="flex items-start gap-3 rounded-xl bg-[var(--surface)]/85 px-3 py-3"
                >
                  <input
                    type="checkbox"
                    checked={dose.taken}
                    disabled={!interactive || savingKey === key}
                    onChange={() => {
                      if (dose.taken) {
                        void handleUntake(dose);
                      } else {
                        void handleTake(dose);
                      }
                    }}
                    className="mt-1 h-5 w-5 accent-[var(--primary)]"
                    aria-label={`${formatDoseTimeDisplay(dose.scheduledTime)} dose of ${dose.brandName}${canUntake ? " (uncheck to undo)" : ""}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatDoseTimeDisplay(dose.scheduledTime)}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {dose.brandName}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Dose {dose.doseIndex}/{dose.dosesPerDay}
                      {dose.compartment != null ? ` · #${dose.compartment}` : ""}
                      {canUntake ? " · tap to undo" : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            {takenCount}/{totalCount} logged · reminder only, not medical advice
          </p>
        </>
      )}
    </section>
  );
}
