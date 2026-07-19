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
    <div className="flex flex-col gap-4">
      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Pack for a trip</h2>
        {inCabinet.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nothing available to pack.</p>
        ) : (
          <>
            <ul className="mt-2 flex flex-col gap-1.5">
              {inCabinet.map((med) => (
                <li key={med.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(med.id)}
                      onChange={() => toggle(med.id)}
                      className="h-4 w-4"
                    />
                    <span className="font-medium text-zinc-900">{med.brandName}</span>
                    <span className="text-xs text-zinc-500">
                      {med.personName ?? "Household"}
                      {med.compartment != null && ` · compartment ${med.compartment}`}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              onClick={() => send("pack", [...selected])}
              disabled={busy || selected.size === 0}
              className="mt-3 rounded bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              🧳 Pack {selected.size || ""} selected — blink their compartments
            </button>
          </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Currently away</h2>
        {away.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nothing is marked away.</p>
        ) : (
          <>
            <ul className="mt-2 flex flex-col gap-1.5">
              {away.map((med) => (
                <li
                  key={med.id}
                  className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-900">{med.brandName}</span>{" "}
                  <span className="text-xs text-zinc-600">
                    {med.personName ?? "Household"}
                    {med.compartment != null && ` · goes back in compartment ${med.compartment}`}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => send("return", away.map((m) => m.id))}
              disabled={busy}
              className="mt-3 rounded border border-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            >
              ✓ Everything&apos;s back in the cabinet
            </button>
          </>
        )}
      </section>

      {message && (
        <p className="text-sm text-zinc-800" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
