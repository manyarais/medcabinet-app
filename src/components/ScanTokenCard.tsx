"use client";

import { useEffect, useState, useTransition } from "react";

/** Shows the household X-Scan-Token for hardware / camera scan APIs. */
export function ScanTokenCard() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/settings/scan-token");
        const data = (await res.json()) as { scanToken?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not load scan token.");
        if (!cancelled) setToken(data.scanToken ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load scan token.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function copy() {
    if (!token) return;
    void navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function regenerate() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/settings/scan-token", { method: "POST" });
        const data = (await res.json()) as { scanToken?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not regenerate token.");
        setToken(data.scanToken ?? null);
        setCopied(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not regenerate token.");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-soft)]">
      <p className="text-sm font-semibold text-[var(--text-primary)]">Scan token</p>
      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
        Send as <code className="font-mono">X-Scan-Token</code> from the scanner
        hardware or camera client. Regenerating disconnects old devices.
      </p>

      <p className="mt-3 break-all rounded-xl bg-[var(--surface-tint)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
        {token ?? (error ? "—" : "Loading…")}
      </p>

      {error && (
        <p className="mt-2 text-xs font-medium text-[var(--danger-text)]">{error}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          disabled={!token}
          className="min-h-9 rounded-full bg-[var(--surface-tint)] px-4 text-xs font-semibold text-[var(--text-primary)] transition duration-150 active:scale-95 disabled:opacity-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="min-h-9 rounded-full bg-[var(--danger-bg)] px-4 text-xs font-semibold text-[var(--danger-text)] transition duration-150 active:scale-95 disabled:opacity-50"
        >
          {pending ? "Regenerating…" : "Regenerate"}
        </button>
      </div>
    </div>
  );
}
