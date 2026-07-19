"use client";

// Symptom lookup UI (Phase 3): match OTC cabinet labels; log "I took this".

import { ProductTypeBadge } from "@/components/ProductTypeBadge";
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="symptom" className="text-sm font-medium text-zinc-700">
          What are you feeling?
        </label>
        <div className="flex gap-2">
          <input
            id="symptom"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. headache"
            className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-3 text-base"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="rounded bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {takeMessage && <p className="text-sm text-[var(--brand-sage-deep)]">{takeMessage}</p>}

      {result && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">
              Medications in your cabinet for this
            </h2>

            {result.matches.length === 0 ? (
              <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-600">
                No medications in your cabinet list this symptom on their label.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {result.matches.map((match) => (
                  <li
                    key={match.medicationId}
                    className="rounded border border-zinc-200 bg-white px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-zinc-900">{match.brandName}</p>
                          {match.outOfCabinet && (
                            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              OUT
                            </span>
                          )}
                        </div>
                        <ProductTypeBadge productType={match.productType} />
                      </div>
                      <p className="text-3xl font-bold tabular-nums text-[var(--brand-sage-deep)]">
                        {match.compartment != null ? `#${match.compartment}` : "—"}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                      {match.matchExcerpt}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleTake(match)}
                      disabled={takingId === match.medicationId}
                      className="mt-4 rounded border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
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
              <h2 className="text-lg font-semibold text-zinc-900">
                Past takes for “{result.symptom}”
              </h2>
              <UsageList entries={result.usedBefore} />
            </section>
          )}
        </>
      )}

      <section className="flex flex-col gap-3 border-t border-zinc-200 pt-6">
        <h2 className="text-lg font-semibold text-zinc-900">Recent symptom takes</h2>
        <p className="text-xs text-zinc-500">
          Saved in your local database whenever you tap I took this (OTC only).
        </p>
        {recent.length === 0 ? (
          <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-600">
            No takes logged yet. Search a symptom and tap I took this.
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
          className="flex items-center justify-between gap-3 rounded border border-zinc-200 bg-white px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-medium text-zinc-900">{entry.brandName}</p>
            {showSymptom && entry.symptom && (
              <p className="text-xs text-zinc-600">for {entry.symptom}</p>
            )}
            <p className="text-xs text-zinc-500">
              {new Date(entry.takenAt).toLocaleString()}
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-[var(--brand-sage-deep)]">
            {entry.compartment != null ? `#${entry.compartment}` : "—"}
          </p>
        </li>
      ))}
    </ul>
  );
}
