"use client";

// Add a finite prescription schedule on an Rx medication detail page (Phase 5).

import { todayLocal } from "@/lib/dates";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ExistingSchedule = {
  id: number;
  dosesPerDay: number;
  pillsPerDose: number;
  startDate: string;
  endDate: string;
};

type Props = {
  medicationId: number;
  brandName: string;
  schedules: ExistingSchedule[];
};

export function AddPrescriptionForm({ medicationId, brandName, schedules }: Props) {
  const router = useRouter();
  const today = todayLocal();
  const [dosesPerDay, setDosesPerDay] = useState("2");
  const [pillsPerDose, setPillsPerDose] = useState("1");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId,
          dosesPerDay: Number(dosesPerDay),
          pillsPerDose: Number(pillsPerDose),
          startDate,
          endDate,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save schedule.");
        return;
      }
      setMessage(`Schedule saved for ${brandName}.`);
      router.refresh();
    } catch {
      setError("Network error while saving schedule.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Prescription schedule</h2>
      <p className="text-xs text-zinc-500">
        Reminder only — this app does not advise on dosing. Start and end dates are required.
      </p>

      {schedules.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm text-zinc-700">
          {schedules.map((rx) => (
            <li key={rx.id} className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2">
              {rx.pillsPerDose} pill{rx.pillsPerDose === 1 ? "" : "s"} × {rx.dosesPerDay}{" "}
              dose{rx.dosesPerDay === 1 ? "" : "s"}/day · {rx.startDate} → {rx.endDate}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-800">Add prescription schedule</h3>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Pills per dose</span>
          <input
            type="number"
            min={1}
            max={20}
            value={pillsPerDose}
            onChange={(event) => setPillsPerDose(event.target.value)}
            className="rounded border border-zinc-300 px-2 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Doses per day</span>
          <input
            type="number"
            min={1}
            max={12}
            value={dosesPerDay}
            onChange={(event) => setDosesPerDay(event.target.value)}
            className="rounded border border-zinc-300 px-2 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded border border-zinc-300 px-2 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">End date</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded border border-zinc-300 px-2 py-2"
            required
          />
        </label>

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {message && <p className="text-sm text-[var(--brand-sage-deep)]">{message}</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save schedule"}
        </button>
      </form>
    </div>
  );
}
