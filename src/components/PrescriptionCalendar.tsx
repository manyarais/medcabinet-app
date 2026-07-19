"use client";

// Month calendar for prescription dose reminders (Phase 5).
// Google Calendar–style month grid + selected-day agenda with checkboxes.

import {
  buildMonthGrid,
  formatDisplayDate,
  formatMonthTitle,
  parseYearMonth,
  shiftMonth,
  todayLocal,
} from "@/lib/dates";
import { formatDoseTimeDisplay } from "@/lib/doseTimes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  isPast: boolean;
  isFuture: boolean;
  doses: Dose[];
  error?: string;
};

type MonthDaySummary = {
  date: string;
  totalDoses: number;
  takenDoses: number;
  events: Array<{
    medicationId: number;
    brandName: string;
    doses: number;
    taken: number;
  }>;
};

type MonthResponse = {
  month: string;
  days: Record<string, MonthDaySummary>;
  error?: string;
};

type Props = {
  initialDate: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS = [
  { chip: "bg-[var(--primary)] text-[var(--text-on-primary)]", dot: "bg-[var(--primary)]" },
  { chip: "bg-[var(--rx)] text-[var(--text-on-primary)]", dot: "bg-[var(--rx)]" },
  { chip: "bg-[var(--warning)] text-[var(--text-on-primary)]", dot: "bg-[var(--warning)]" },
  { chip: "bg-[var(--otc-text)] text-[var(--text-on-primary)]", dot: "bg-[var(--otc-text)]" },
  { chip: "bg-[var(--brand-tint)] text-[var(--otc-text)]", dot: "bg-[var(--brand-tint)]" },
  { chip: "bg-[var(--rx-bg)] text-[var(--rx-text)]", dot: "bg-[var(--rx)]" },
];

function colorsForMed(medicationId: number) {
  return EVENT_COLORS[medicationId % EVENT_COLORS.length] ?? EVENT_COLORS[0];
}

export function PrescriptionCalendar({ initialDate }: Props) {
  const router = useRouter();
  const today = todayLocal();
  const initialYm = parseYearMonth(initialDate);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [year, setYear] = useState(initialYm.year);
  const [monthIndex, setMonthIndex] = useState(initialYm.monthIndex);

  const [monthData, setMonthData] = useState<MonthResponse | null>(null);
  const [dayData, setDayData] = useState<CalendarResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthLoading, setMonthLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const grid = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);

  useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      setMonthLoading(true);
      try {
        const response = await fetch(
          `/api/calendar/month?month=${encodeURIComponent(monthKey)}`,
        );
        const json = (await response.json()) as MonthResponse;
        if (!response.ok) {
          if (!cancelled) setError(json.error ?? "Could not load month.");
          return;
        }
        if (!cancelled) {
          setMonthData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Could not reach the calendar API.");
      } finally {
        if (!cancelled) setMonthLoading(false);
      }
    }

    void loadMonth();
    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadDay() {
      setDayLoading(true);
      try {
        const response = await fetch(
          `/api/calendar?date=${encodeURIComponent(selectedDate)}`,
        );
        const json = (await response.json()) as CalendarResponse;
        if (!response.ok) {
          if (!cancelled) setError(json.error ?? "Could not load day.");
          return;
        }
        if (!cancelled) setDayData(json);
      } catch {
        if (!cancelled) setError("Could not reach the calendar API.");
      } finally {
        if (!cancelled) setDayLoading(false);
      }
    }

    void loadDay();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  function selectDate(nextDate: string) {
    setSelectedDate(nextDate);
    const ym = parseYearMonth(nextDate);
    setYear(ym.year);
    setMonthIndex(ym.monthIndex);
    router.replace(`/calendar?date=${encodeURIComponent(nextDate)}`, {
      scroll: false,
    });
  }

  function goMonth(delta: number) {
    const next = shiftMonth(year, monthIndex, delta);
    setYear(next.year);
    setMonthIndex(next.monthIndex);
    const firstOfMonth = `${next.year}-${String(next.monthIndex + 1).padStart(2, "0")}-01`;
    // Keep selection in the visible month when possible
    const stillInMonth =
      selectedDate.startsWith(
        `${next.year}-${String(next.monthIndex + 1).padStart(2, "0")}`,
      );
    if (!stillInMonth) {
      const jump =
        today.startsWith(
          `${next.year}-${String(next.monthIndex + 1).padStart(2, "0")}`,
        )
          ? today
          : firstOfMonth;
      setSelectedDate(jump);
      router.replace(`/calendar?date=${encodeURIComponent(jump)}`, {
        scroll: false,
      });
    }
  }

  async function refreshMonthAndDay() {
    const [monthRes, dayRes] = await Promise.all([
      fetch(`/api/calendar/month?month=${encodeURIComponent(monthKey)}`),
      fetch(`/api/calendar?date=${encodeURIComponent(selectedDate)}`),
    ]);
    if (monthRes.ok) {
      setMonthData((await monthRes.json()) as MonthResponse);
    }
    if (dayRes.ok) {
      setDayData((await dayRes.json()) as CalendarResponse);
    }
  }

  async function handleTake(dose: Dose) {
    if (!dayData || !dayData.isToday || dose.taken) return;

    const key = `${dose.medicationId}-${dose.prescriptionId}-${dose.doseIndex}`;
    setSavingKey(key);
    setError(null);

    try {
      const response = await fetch("/api/calendar/take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: dose.medicationId,
          date: selectedDate,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Could not log dose.");
        return;
      }
      await refreshMonthAndDay();
    } catch {
      setError("Network error while logging dose.");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleUntake(dose: Dose) {
    if (!dayData || !dayData.isToday || !dose.taken) return;

    const key = `${dose.medicationId}-${dose.prescriptionId}-${dose.doseIndex}`;
    setSavingKey(key);
    setError(null);

    try {
      const response = await fetch("/api/calendar/untake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: dose.medicationId,
          date: selectedDate,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Could not undo dose.");
        return;
      }
      await refreshMonthAndDay();
    } catch {
      setError("Network error while undoing dose.");
    } finally {
      setSavingKey(null);
    }
  }

  /** Only the latest taken slot for a med can be unchecked (LIFO). */
  function canUntakeDose(dose: Dose, doses: Dose[]) {
    if (!dose.taken) return false;
    const takenMax = doses
      .filter((d) => d.medicationId === dose.medicationId && d.taken)
      .reduce((max, d) => Math.max(max, d.absoluteIndex), 0);
    return dose.absoluteIndex === takenMax;
  }

  const readOnly = Boolean(dayData && !dayData.isToday);
  const selectedSummary = monthData?.days[selectedDate];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <section className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-[var(--surface)] shadow-sm shadow-black/[0.04]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-medium text-[var(--text-primary)] transition duration-150 active:bg-[var(--surface-tint)]"
              aria-label="Previous month"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-medium text-[var(--text-primary)] transition duration-150 active:bg-[var(--surface-tint)]"
              aria-label="Next month"
            >
              ›
            </button>
            <h2 className="ml-1 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              {formatMonthTitle(year, monthIndex)}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => selectDate(today)}
            className="rounded-full bg-[var(--brand-tint)] px-3 py-2 text-xs font-semibold text-[var(--primary)] transition duration-150 active:scale-95"
          >
            Today
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-tint)]">
          {WEEKDAYS.map((label) => (
            <div
              key={label}
              className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-[minmax(4.75rem,1fr)]">
          {grid.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`pad-${index}`}
                  className="min-h-[4.75rem] border-b border-r border-[var(--border)] bg-[var(--accent-cream)]/40"
                />
              );
            }

            const summary = monthData?.days[date];
            const isSelected = date === selectedDate;
            const isToday = date === today;
            const events = summary?.events ?? [];

            return (
              <button
                key={date}
                type="button"
                onClick={() => selectDate(date)}
                className={`flex min-h-[4.75rem] flex-col gap-1 border-b border-r border-[var(--border)] px-1 py-1.5 text-left transition duration-150 active:bg-[var(--brand-tint)]/50 ${
                  isSelected ? "bg-[var(--brand-tint)]/60" : "bg-[var(--surface)]"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday
                      ? "bg-[var(--primary)] text-[var(--text-on-primary)]"
                      : isSelected
                        ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                        : "text-[var(--text-primary)]"
                  }`}
                >
                  {Number(date.slice(-2))}
                </span>

                <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                  {monthLoading ? null : (
                    <>
                      {events.slice(0, 3).map((event) => (
                        <span
                          key={`${date}-${event.medicationId}`}
                          className={`truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight ${colorsForMed(event.medicationId).chip}`}
                          title={`${event.brandName}: ${event.taken}/${event.doses}`}
                        >
                          {event.brandName}
                          {event.doses > 1 ? ` · ${event.taken}/${event.doses}` : ""}
                        </span>
                      ))}
                      {events.length > 3 && (
                        <span className="px-1 text-[10px] font-medium text-[var(--text-secondary)]">
                          +{events.length - 3} more
                        </span>
                      )}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="w-full shrink-0 rounded-2xl bg-[var(--surface)] p-4 shadow-sm shadow-black/[0.04] lg:w-80">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          {dayData?.isToday ? "Today" : dayData?.isPast ? "Past day" : "Upcoming"}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          {formatDisplayDate(selectedDate)}
        </h3>

        {readOnly && (
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {dayData?.isPast
              ? "Read-only log for this day."
              : "Reminder only — check off doses on the day they are due."}
          </p>
        )}

        {error && (
          <p
            className="mt-3 rounded-2xl bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]"
            role="alert"
          >
            {error}
          </p>
        )}

        {dayLoading && (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading…</p>
        )}

        {!dayLoading && dayData && dayData.doses.length === 0 && (
          <p className="mt-4 rounded-2xl bg-[var(--accent-cream)] px-3 py-6 text-center text-sm text-[var(--text-secondary)]">
            No prescription doses on this day.
          </p>
        )}

        {!dayLoading && dayData && dayData.doses.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {dayData.doses.map((dose) => {
              const key = `${dose.medicationId}-${dose.prescriptionId}-${dose.doseIndex}`;
              const canCheck = !readOnly && !dose.taken;
              const canUntake = !readOnly && canUntakeDose(dose, dayData.doses);
              const interactive = canCheck || canUntake;
              return (
                <li
                  key={key}
                  className="flex items-start gap-3 rounded-2xl bg-[var(--surface-tint)] px-3 py-3"
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${colorsForMed(dose.medicationId).dot}`}
                    aria-hidden
                  />
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
                    className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                    aria-label={`${formatDoseTimeDisplay(dose.scheduledTime)} dose of ${dose.brandName}${canUntake ? " (uncheck to undo)" : ""}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatDoseTimeDisplay(dose.scheduledTime)}
                      </span>
                      <Link
                        href={`/drugs/${encodeURIComponent(dose.brandName)}`}
                        className="font-semibold text-[var(--text-primary)]"
                      >
                        {dose.brandName}
                      </Link>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Dose {dose.doseIndex}/{dose.dosesPerDay} · {dose.pillsPerDose}{" "}
                      pill{dose.pillsPerDose === 1 ? "" : "s"}
                      {dose.compartment != null ? ` · ${dose.compartment}` : ""}
                      {canUntake ? " · tap to undo" : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {selectedSummary && selectedSummary.totalDoses > 0 && (
          <p className="mt-4 text-xs text-[var(--text-secondary)]">
            {selectedSummary.takenDoses}/{selectedSummary.totalDoses} doses logged
          </p>
        )}
      </aside>
    </div>
  );
}
