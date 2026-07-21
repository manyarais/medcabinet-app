"use client";

// Caregiver summary card: shows the latest generated summary and can build a
// fresh daily/weekly one. Every line comes from the deterministic fact set —
// the card is presentation only.

import { useEffect, useState } from "react";

type Section = {
  title: string;
  items: Array<{ text: string; evidence_ids: Array<{ type: string; id: number }> }>;
};

type Summary = {
  summary_id: number;
  period: string;
  headline: string;
  sections: Section[];
  generated_at: string;
  model_version: string;
};

export function CaregiverSummaryCard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/ai/summaries", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { summary: Summary | null } | null) => {
        if (d?.summary) setSummary(d.summary);
      })
      .catch(() => undefined);
  }, []);

  async function generate(period: "DAILY" | "WEEKLY") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data = (await res.json()) as { summary?: Summary; error?: string };
      if (!res.ok || !data.summary) throw new Error(data.error ?? "Could not generate the summary.");
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the summary.");
    }
    setBusy(false);
  }

  return (
    <section className="mb-5 rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Caregiver summary</h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void generate("DAILY")}
            disabled={busy}
            className="rounded-full bg-[var(--surface-tint)] px-3 py-1.5 text-[11px] font-semibold text-[var(--primary)] transition active:scale-95 disabled:opacity-50"
          >
            {busy ? "…" : "Today"}
          </button>
          <button
            type="button"
            onClick={() => void generate("WEEKLY")}
            disabled={busy}
            className="rounded-full bg-[var(--surface-tint)] px-3 py-1.5 text-[11px] font-semibold text-[var(--primary)] transition active:scale-95 disabled:opacity-50"
          >
            This week
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 rounded-xl bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">{error}</p>
      )}

      {summary ? (
        <div className="mt-2 flex flex-col gap-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">{summary.headline}</p>
          {summary.sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {section.title}
              </h3>
              <ul className="mt-1 flex flex-col gap-1">
                {section.items.map((item, i) => (
                  <li key={i} className="text-xs text-[var(--text-primary)]">
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[10px] text-[var(--text-secondary)]">
            Generated {new Date(summary.generated_at).toLocaleString()} · cabinet and inventory
            facts only — Pillio never reports whether a dose was taken.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          No summary yet — generate one for today or the past week.
        </p>
      )}
    </section>
  );
}
