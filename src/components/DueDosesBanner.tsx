"use client";

// In-app due / overdue prescription reminders (web-first; no push yet).

import {
  doseUrgency,
  formatDoseTimeDisplay,
  type DoseUrgency,
} from "@/lib/doseTimes";
import { notifyDueDoses } from "@/lib/doseNotifications";
import { todayLocal } from "@/lib/dates";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type CalendarDose = {
  prescriptionId: number;
  medicationId: number;
  brandName: string;
  doseIndex: number;
  absoluteIndex: number;
  dosesPerDay: number;
  scheduledTime: string;
  taken: boolean;
};

type CalendarResponse = {
  date: string;
  isToday: boolean;
  doses: CalendarDose[];
};

type AttentionDose = CalendarDose & {
  urgency: Extract<DoseUrgency, "overdue" | "due_soon">;
};

const POLL_MS = 60_000;

function isNextTakeable(dose: CalendarDose, doses: CalendarDose[]): boolean {
  if (dose.taken) return false;
  const untaken = doses.filter(
    (d) => d.medicationId === dose.medicationId && !d.taken,
  );
  if (untaken.length === 0) return false;
  const nextIndex = Math.min(...untaken.map((d) => d.absoluteIndex));
  return dose.absoluteIndex === nextIndex;
}

export function DueDosesBanner() {
  const [items, setItems] = useState<AttentionDose[]>([]);
  const [allDoses, setAllDoses] = useState<CalendarDose[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const today = todayLocal();
      const response = await fetch(`/api/calendar?date=${encodeURIComponent(today)}`);
      if (!response.ok) return;
      const json = (await response.json()) as CalendarResponse;
      const now = new Date();
      const attention: AttentionDose[] = [];
      for (const dose of json.doses) {
        const urgency = doseUrgency(dose.scheduledTime, dose.taken, now);
        if (urgency === "overdue" || urgency === "due_soon") {
          attention.push({ ...dose, urgency });
        }
      }
      attention.sort((a, b) => {
        if (a.urgency !== b.urgency) {
          return a.urgency === "overdue" ? -1 : 1;
        }
        return a.scheduledTime.localeCompare(b.scheduledTime);
      });
      setAllDoses(json.doses);
      setItems(attention);
      setError(null);
      notifyDueDoses(
        today,
        attention.map((dose) => ({
          medicationId: dose.medicationId,
          brandName: dose.brandName,
          absoluteIndex: dose.absoluteIndex,
          scheduledTime: dose.scheduledTime,
          urgency: dose.urgency,
        })),
      );
    } catch {
      // Silent — banner is best-effort.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  async function handleTake(dose: AttentionDose) {
    setSavingId(dose.medicationId);
    setError(null);
    try {
      const response = await fetch("/api/calendar/take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: dose.medicationId,
          date: todayLocal(),
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Could not log dose.");
        return;
      }
      await refresh();
    } catch {
      setError("Network error while logging dose.");
    } finally {
      setSavingId(null);
    }
  }

  if (items.length === 0) return null;

  const fingerprint = items
    .map((d) => `${d.medicationId}-${d.absoluteIndex}-${d.urgency}`)
    .join("|");
  if (dismissedKey === fingerprint) return null;

  const overdueCount = items.filter((d) => d.urgency === "overdue").length;

  return (
    <div
      className={`border-b ${
        overdueCount > 0
          ? "border-amber-300 bg-amber-50"
          : "border-[var(--brand-sage)] bg-[#e8f2f0]"
      }`}
      role="status"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              {overdueCount > 0
                ? `${overdueCount} dose${overdueCount === 1 ? "" : "s"} overdue`
                : "Dose due soon"}
            </p>
            <p className="text-xs text-zinc-600">Reminder only — not medical advice.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/calendar"
              className="text-xs font-medium text-[var(--brand-sage-deep)] hover:underline"
            >
              Calendar
            </Link>
            <button
              type="button"
              onClick={() => setDismissedKey(fingerprint)}
              className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-black/5 hover:text-zinc-800"
              aria-label="Dismiss reminders"
            >
              Dismiss
            </button>
          </div>
        </div>

        <ul className="flex flex-col gap-1.5">
          {items.map((dose) => {
            const canTake = isNextTakeable(dose, allDoses);
            return (
              <li
                key={`${dose.medicationId}-${dose.prescriptionId}-${dose.doseIndex}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-black/5 bg-white/70 px-2.5 py-2"
              >
                <div className="min-w-0 text-sm">
                  <span
                    className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      dose.urgency === "overdue"
                        ? "bg-amber-500 text-white"
                        : "bg-[var(--brand-sage-deep)] text-white"
                    }`}
                  >
                    {dose.urgency === "overdue" ? "Overdue" : "Soon"}
                  </span>
                  <span className="font-semibold tabular-nums text-zinc-800">
                    {formatDoseTimeDisplay(dose.scheduledTime)}
                  </span>
                  <span className="mx-1.5 text-zinc-400">·</span>
                  <Link
                    href={`/drugs/${encodeURIComponent(dose.brandName)}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {dose.brandName}
                  </Link>
                  <span className="ml-1.5 text-xs text-zinc-500">
                    {dose.doseIndex}/{dose.dosesPerDay}
                  </span>
                </div>
                {canTake && (
                  <button
                    type="button"
                    disabled={savingId === dose.medicationId}
                    onClick={() => void handleTake(dose)}
                    className="rounded bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {savingId === dose.medicationId ? "Saving…" : "Mark taken"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {error && (
          <p className="text-xs text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
