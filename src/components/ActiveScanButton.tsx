"use client";

// Smart scan: starts an active-vision scan session and shows the live field
// checklist while the planner captures/rotates. Ends by refreshing the page
// so the new pending scan appears in the review list.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type FieldProgress = {
  field: string;
  label: string;
  state: "found" | "scanning" | "not_on_label" | "conflict";
  value: string | null;
};

type SessionView = {
  id: string;
  status: string;
  totalRotationDeg: number;
  frameCount: number;
  completion: number;
  fieldProgress: FieldProgress[];
  lastAction: { action: string; reason: string } | null;
  medicationId: number | null;
  error: string | null;
};

const DONE_STATUSES = new Set([
  "COMPLETE",
  "MAX_ROTATION_REACHED",
  "USER_REVIEW_REQUIRED",
  "HARDWARE_ERROR",
]);

export function ActiveScanButton() {
  const [session, setSession] = useState<SessionView | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => () => stopPolling(), []);

  function stopPolling() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  async function start() {
    setStarting(true);
    setError(null);
    setSession(null);
    try {
      const res = await fetch("/api/ai/scan-sessions", { method: "POST" });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Could not start the scan.");
      const id = data.id;
      timer.current = setInterval(() => void poll(id), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the scan.");
    }
    setStarting(false);
  }

  async function poll(id: string) {
    try {
      const res = await fetch(`/api/ai/scan-sessions/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const view = (await res.json()) as SessionView;
      setSession(view);
      if (DONE_STATUSES.has(view.status)) {
        stopPolling();
        if (view.medicationId != null) router.refresh();
      }
    } catch {
      // transient poll failure — keep trying
    }
  }

  const running = session != null && !DONE_STATUSES.has(session.status);

  return (
    <section className="mt-4 rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Smart scan</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            The camera decides its own angles and stops when the label is fully read — usually
            fewer photos than a classic scan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void start()}
          disabled={starting || running}
          className="shrink-0 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
        >
          {running ? "Scanning…" : starting ? "Starting…" : "Start"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">
          {error}
        </p>
      )}

      {session && (
        <div className="mt-3 flex flex-col gap-1.5">
          <ul className="flex flex-col gap-1">
            {session.fieldProgress.map((f) => (
              <li key={f.field} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-center">
                  {f.state === "found" ? "✅" : f.state === "not_on_label" ? "➖" : f.state === "conflict" ? "⚠️" : "🔄"}
                </span>
                <span className="font-medium text-[var(--text-primary)]">{f.label}</span>
                <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
                  {f.state === "found" && f.value
                    ? f.value
                    : f.state === "not_on_label"
                      ? "not on this label"
                      : f.state === "conflict"
                        ? "frames disagree — will need review"
                        : "scanning…"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {session.frameCount} photo{session.frameCount === 1 ? "" : "s"} ·{" "}
            {session.totalRotationDeg}° turned
            {session.lastAction ? ` · ${session.lastAction.reason}` : ""}
          </p>
          {DONE_STATUSES.has(session.status) && (
            <p className="text-xs font-medium text-[var(--text-primary)]">
              {session.status === "COMPLETE"
                ? "Done — review the scan below to confirm it."
                : session.status === "HARDWARE_ERROR"
                  ? `Scan failed: ${session.error ?? "hardware error"}`
                  : session.medicationId != null
                    ? "Done with some gaps — review the scan below."
                    : `Could not read the label: ${session.error ?? "try better lighting."}`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
