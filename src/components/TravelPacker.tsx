"use client";

// Travel packing UI: check off medications, "Pack" marks them away and blinks
// each compartment; "Everything's back" restores them.

import { useRouter } from "next/navigation";
import { useState } from "react";

export type TravelMed = {
  id: number;
  brandName: string;
  personName: string | null;
  compartment: number | null;
  outOfCabinet: boolean;
};

export function TravelPacker({ meds }: { meds: TravelMed[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const inCabinet = meds.filter((m) => !m.outOfCabinet);
  const away = meds.filter((m) => m.outOfCabinet);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send(action: "pack" | "return", ids: number[]) {
    if (ids.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const data = (await res.json()) as {
        count?: number;
        flashedCompartments?: number[];
        error?: string;
      };
      if (!res.ok) {
        setMessage(data.error ?? "Failed.");
        return;
      }
      if (action === "pack") {
        const lights = data.flashedCompartments?.length
          ? ` Compartments ${data.flashedCompartments.join(", ")} are blinking — collect the bottles and press each button.`
          : "";
        setMessage(`Marked ${data.count} medication${data.count === 1 ? "" : "s"} as packed.${lights}`);
        setSelected(new Set());
      } else {
        setMessage("Welcome back — everything marked returned.");
      }
      router.refresh();
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Pack for a trip
        </h2>
        {inCabinet.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-[var(--accent-cream)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
            Nothing available to pack.
          </p>
        ) : (
          <>
            <ul className="mt-3 flex flex-col gap-2">
              {inCabinet.map((med) => (
                <li key={med.id}>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm shadow-sm shadow-black/[0.04]">
                    <input
                      type="checkbox"
                      checked={selected.has(med.id)}
                      onChange={() => toggle(med.id)}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    <span className="font-semibold text-[var(--text-primary)]">{med.brandName}</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {med.personName ?? "Household"}
                      {med.compartment != null && ` · ${med.compartment}`}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              onClick={() => send("pack", [...selected])}
              disabled={busy || selected.size === 0}
              className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--text-on-primary)] transition duration-150 active:bg-[var(--primary-pressed)] active:scale-[0.99] disabled:opacity-50"
            >
              Pack {selected.size || ""} selected — blink bays
            </button>
          </>
        )}
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Currently away
        </h2>
        {away.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Nothing is marked away.</p>
        ) : (
          <>
            <ul className="mt-3 flex flex-col gap-2">
              {away.map((med) => (
                <li
                  key={med.id}
                  className="rounded-2xl bg-[var(--warning-bg)] px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-[var(--text-primary)]">{med.brandName}</span>{" "}
                  <span className="text-xs text-[var(--warning-text)]">
                    {med.personName ?? "Household"}
                    {med.compartment != null && ` · back to ${med.compartment}`}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => send("return", away.map((m) => m.id))}
              disabled={busy}
              className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--surface-tint)] px-4 text-sm font-semibold text-[var(--text-primary)] transition duration-150 active:scale-[0.99] disabled:opacity-50"
            >
              Everything&apos;s back in the cabinet
            </button>
          </>
        )}
      </section>

      {message && (
        <p className="text-sm font-medium text-[var(--primary)]" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
