"use client";

// Day calendar for prescription dose reminders (Phase 5).
// Checked state comes from UsageLog count; past days are read-only.

import {
  addDaysLocal,
  formatDisplayDate,
  todayLocal,
} from "@/lib/dates";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Dose = {
  prescriptionId: number;
  medicationId: number;
  brandName: string;
  compartment: number | null;
  doseIndex: number;
  dosesPerDay: number;
  pillsPerDose: number;
  taken: boolean;
};

type CalendarResponse = {
  date: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  doses: Dose[];
  error?: string;
};

type Props = {
  initialDate: string;
};

export function PrescriptionCalendar({ initialDate }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/calendar?date=${encodeURIComponent(date)}`);
        const json = (await response.json()) as CalendarResponse;
        if (!response.ok) {
          if (!cancelled) setError(json.error ?? "Could not load calendar.");
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Could not reach the calendar API.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  function goTo(nextDate: string) {
    setDate(nextDate);
    router.replace(`/calendar?date=${encodeURIComponent(nextDate)}`, { scroll: false });
  }

  async function handleTake(dose: Dose) {
    if (!data || data.isPast || dose.taken) return;

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

      const refresh = await fetch(`/api/calendar?date=${encodeURIComponent(date)}`);
      const refreshed = (await refresh.json()) as CalendarResponse;
      if (refresh.ok) setData(refreshed);
    } catch {
      setError("Network error while logging dose.");
    } finally {
      setSavingKey(null);
    }
  }

  const today = todayLocal();
  const readOnly = Boolean(data && !data.isToday);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(addDaysLocal(date, -1))}
          className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium"
        >
          Previous
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold text-zinc-900">{formatDisplayDate(date)}</p>
          {date !== today && (
            <button
              type="button"
              onClick={() => goTo(today)}
              className="mt-1 text-xs font-medium text-[var(--brand-sage-deep)] hover:underline"
            >
              Jump to today
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => goTo(addDaysLocal(date, 1))}
          className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium"
        >
          Next
        </button>
      </div>

      {readOnly && (
        <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          {data?.isPast
            ? "Past day — showing logged doses (read-only)."
            : "Upcoming day — reminder list only (check off doses on the day they are due)."}
        </p>
      )}

      {loading && <p className="text-sm text-zinc-500">Loading doses…</p>}

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {!loading && data && data.doses.length === 0 && (
        <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-600">
          No prescription doses scheduled for this day.
        </p>
      )}

      {!loading && data && data.doses.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.doses.map((dose) => {
            const key = `${dose.medicationId}-${dose.prescriptionId}-${dose.doseIndex}`;
            const canCheck = !readOnly && !dose.taken;
            return (
              <li
                key={key}
                className="flex items-start gap-3 rounded border border-zinc-200 bg-white px-4 py-4"
              >
                <input
                  type="checkbox"
                  checked={dose.taken}
                  disabled={!canCheck || savingKey === key}
                  onChange={() => {
                    void handleTake(dose);
                  }}
                  className="mt-1 h-5 w-5"
                  aria-label={`Dose ${dose.doseIndex} of ${dose.brandName}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/drugs/${encodeURIComponent(dose.brandName)}`}
                      className="font-semibold text-zinc-900 hover:underline"
                    >
                      {dose.brandName}
                    </Link>
                    <span className="text-sm tabular-nums text-zinc-500">
                      {dose.compartment != null ? `#${dose.compartment}` : "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    Dose {dose.doseIndex} of {dose.dosesPerDay} · {dose.pillsPerDose}{" "}
                    pill{dose.pillsPerDose === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
