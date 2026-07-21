"use client";

// "Explain simply" — plain-language rewrite of a confirmed label's directions,
// always shown BESIDE the original wording, with the key details as chips.
// When Pillio can't verify the rewrite keeps the meaning, it says so instead.

import { useState } from "react";

type PlainResult = {
  original_text: string;
  plain_language_text: string | null;
  preserved_values: Record<string, string>;
  warnings: string[];
  requires_review: boolean;
  refused_reason: string | null;
};

export function ExplainLabelButton({ medicationId }: { medicationId: number }) {
  const [result, setResult] = useState<PlainResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function explain() {
    if (result) {
      setResult(null); // acts as a toggle once loaded
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/plain-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicationId }),
      });
      const data = (await res.json()) as { result?: PlainResult; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "Could not explain this label.");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not explain this label.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => void explain()}
        disabled={busy}
        className="rounded-full bg-[var(--surface-tint)] px-3 py-1.5 text-[11px] font-semibold text-[var(--primary)] transition active:scale-95 disabled:opacity-50"
      >
        {busy ? "Reading label…" : result ? "Hide explanation" : "Explain simply"}
      </button>

      {error && <p className="mt-1.5 text-xs text-[var(--danger-text)]">{error}</p>}

      {result && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-[var(--accent-cream)] px-3 py-2.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Original label
            </p>
            <p className="text-xs text-[var(--text-primary)]">{result.original_text}</p>
          </div>
          {result.plain_language_text ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Easier explanation
              </p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {result.plain_language_text}
              </p>
            </div>
          ) : (
            <p className="text-xs text-[var(--warning-text)]">{result.refused_reason}</p>
          )}
          {Object.keys(result.preserved_values).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(result.preserved_values).map(([key, value]) => (
                <span
                  key={key}
                  className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                >
                  <span className="font-semibold">{key.replace(/_/g, " ")}:</span> {value}
                </span>
              ))}
            </div>
          )}
          {result.warnings.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-[11px] font-medium text-[var(--warning-text)]">
                  ⚠ {w}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-[var(--text-secondary)]">
            The original pharmacy label is always the controlling source.
          </p>
        </div>
      )}
    </div>
  );
}
