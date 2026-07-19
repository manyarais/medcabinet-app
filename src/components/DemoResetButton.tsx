"use client";

// One-button reset to the demo starting state — wipes everything, so it
// requires typing "reset" to confirm.

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DemoResetButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canWipe = typed.trim().toLowerCase() === "reset";

  function cancel() {
    setConfirming(false);
    setTyped("");
  }

  async function reset() {
    if (!canWipe) return;
    setBusy(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      setMessage(
        res.ok
          ? "Reset — cabinet is empty, all lights red. First scan will use compartment 1."
          : "Reset failed.",
      );
      router.refresh();
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
      cancel();
    }
  }

  return (
    <div className="rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-soft)]">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">Demo reset</h2>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
        Deletes all medications, schedules, and history, and resets every cabinet
        light to red — a completely empty cabinet.
      </p>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-full bg-[var(--danger-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--danger-text)] transition duration-150 active:scale-95"
        >
          Reset to demo state…
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <ul className="rounded-2xl bg-[var(--danger-bg)] px-3 py-3 text-xs leading-relaxed text-[var(--danger-text)]">
            <li>All medications and pending scans</li>
            <li>Prescription schedules and dose logs</li>
            <li>Activity history and reminder call logs</li>
            <li>Cabinet lights reset to empty (red)</li>
          </ul>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-[var(--text-primary)]">
              Type <span className="font-mono">reset</span> to confirm
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="min-h-11 rounded-2xl border-0 bg-[var(--surface-tint)] px-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--danger)]/30"
              placeholder="reset"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void reset()}
              disabled={busy || !canWipe}
              className="rounded-full bg-[var(--danger)] px-3.5 py-2 text-xs font-semibold text-[var(--text-on-primary)] transition duration-150 active:scale-95 disabled:opacity-40"
            >
              {busy ? "Resetting…" : "Wipe everything"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="rounded-full bg-[var(--surface-tint)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition duration-150 active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className="mt-2 text-sm text-[var(--text-primary)]" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
