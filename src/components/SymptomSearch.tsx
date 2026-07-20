"use client";

// Symptom lookup UI (Phase 3): match OTC cabinet labels; log "I took this".

import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { VoiceMicButton } from "@/components/VoiceMicButton";
import { FormEvent, useEffect, useState } from "react";

type Match = {
  medicationId: number;
  brandName: string;
  productType: string;
  compartment: number | null;
  outOfCabinet: boolean;
  matchExcerpt: string;
};

type UsedBefore = {
  id: number;
  medicationId: number | null;
  brandName: string;
  compartment: number | null;
  productType: string;
  symptom: string | null;
  takenAt: string;
};

type SearchResponse = {
  symptom: string;
  matches: Match[];
  usedBefore: UsedBefore[];
  error?: string;
};

type HistoryResponse = {
  entries: UsedBefore[];
  error?: string;
};

export function SymptomSearch() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [takeMessage, setTakeMessage] = useState<string | null>(null);
  const [takingId, setTakingId] = useState<number | null>(null);
  const [recent, setRecent] = useState<UsedBefore[]>([]);

  async function loadRecent() {
    try {
      const response = await fetch("/api/symptoms/history?limit=15");
      if (!response.ok) return;
      const data = (await response.json()) as HistoryResponse;
      setRecent(data.entries ?? []);
    } catch {
      // Best-effort history strip.
    }
  }

  useEffect(() => {
    const boot = window.setTimeout(() => void loadRecent(), 0);
    return () => window.clearTimeout(boot);
  }, []);

  async function runSearch(symptom: string, options?: { preserveTakeMessage?: boolean }) {
    setIsLoading(true);
    setError(null);
    if (!options?.preserveTakeMessage) {
      setTakeMessage(null);
    }
    setResult(null);

    try {
      const response = await fetch(`/api/symptoms?q=${encodeURIComponent(symptom)}`);
      const data = (await response.json()) as SearchResponse;
      if (!response.ok) {
        setError(data.error ?? "Search failed.");
        return;
      }
      setResult(data);
    } catch {
      setError("Could not reach the symptom API.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    await runSearch(trimmed);
  }

  async function handleTake(match: Match) {
    if (!result) return;
    setTakingId(match.medicationId);
    setTakeMessage(null);
    try {
      const response = await fetch("/api/symptoms/take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: match.medicationId,
          symptom: result.symptom,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setTakeMessage(data.error ?? "Could not log this dose.");
        return;
      }
      await runSearch(result.symptom, { preserveTakeMessage: true });
      await loadRecent();
      setTakeMessage(`Logged taking ${match.brandName} for “${result.symptom}”.`);
    } catch {
      setTakeMessage("Network error while logging.");
    } finally {
      setTakingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label htmlFor="symptom" className="sr-only">
          What are you feeling?
        </label>
        <input
          id="symptom"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What are you feeling?"
          className="min-h-12 min-w-0 flex-1 rounded-full border-0 bg-[var(--surface-tint)] px-5 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--primary)]/25"
        />
        <VoiceMicButton
          onTranscript={setQuery}
          onFinal={(text) => {
            setQuery(text);
            void runSearch(text);
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center btn-primary-fill rounded-full text-sm font-semibold transition duration-150 ease-out active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "…" : "Go"}
        </button>
      </form>

      {error && (
        <p
          className="rounded-2xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
          role="alert"
        >
          {error}
        </p>
      )}

      {takeMessage && (
        <p className="text-sm font-medium text-[var(--primary)]">{takeMessage}</p>
      )}

      {result && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              In your cabinet
            </h2>

            {result.matches.length === 0 ? (
              <p className="rounded-2xl bg-[var(--accent-cream)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                Nothing in your cabinet matches that on the label.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {result.matches.map((match) => (
                  <li
                    key={match.medicationId}
                    className="rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-[var(--text-primary)]">
                            {match.brandName}
                          </p>
                          {match.outOfCabinet && (
                            <span className="rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--warning-text)]">
                              Out
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <ProductTypeBadge productType={match.productType} />
                        </div>
                      </div>
                      <p className="text-3xl font-bold tabular-nums text-[var(--primary)]">
                        {match.compartment != null ? match.compartment : "—"}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {match.matchExcerpt}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleTake(match)}
                      disabled={takingId === match.medicationId}
                      className="mt-4 min-h-11 rounded-2xl btn-primary-fill px-4 text-sm font-semibold transition duration-150 ease-out disabled:opacity-50"
                    >
                      {takingId === match.medicationId ? "Logging…" : "I took this"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {result.usedBefore.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Past takes for “{result.symptom}”
              </h2>
              <UsageList entries={result.usedBefore} />
            </section>
          )}
        </>
      )}

      <section className="flex flex-col gap-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Recent
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Personal log only — OTC matches from your cabinet.
        </p>
        {recent.length === 0 ? (
          <p className="rounded-2xl bg-[var(--accent-cream)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
            No takes logged yet.
          </p>
        ) : (
          <UsageList entries={recent} showSymptom />
        )}
      </section>
    </div>
  );
}

function UsageList({
  entries,
  showSymptom = false,
}: {
  entries: UsedBefore[];
  showSymptom?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]"
        >
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)]">{entry.brandName}</p>
            {showSymptom && entry.symptom && (
              <p className="text-xs text-[var(--text-secondary)]">for {entry.symptom}</p>
            )}
            <p className="text-xs text-[var(--text-secondary)]">
              {new Date(entry.takenAt).toLocaleString()}
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-[var(--primary)]">
            {entry.compartment != null ? entry.compartment : "—"}
          </p>
        </li>
      ))}
    </ul>
  );
}
