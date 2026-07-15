"use client";

// Symptom lookup UI (Phase 3): match OTC cabinet labels; log "Take this".

import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { FormEvent, useState } from "react";

type Match = {
  medicationId: number;
  brandName: string;
  productType: string;
  compartment: number | null;
  matchExcerpt: string;
};

type UsedBefore = {
  id: number;
  medicationId: number;
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

export function SymptomSearch() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [takeMessage, setTakeMessage] = useState<string | null>(null);
  const [takingId, setTakingId] = useState<number | null>(null);

  async function runSearch(symptom: string) {
    setIsLoading(true);
    setError(null);
    setTakeMessage(null);
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
      setTakeMessage(`Logged taking ${match.brandName}.`);
      await runSearch(result.symptom);
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
            className="rounded bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
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

      {takeMessage && <p className="text-sm text-teal-800">{takeMessage}</p>}

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
                        <p className="text-lg font-semibold text-zinc-900">{match.brandName}</p>
                        <ProductTypeBadge productType={match.productType} />
                      </div>
                      <p className="text-3xl font-bold tabular-nums text-teal-800">
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
                      {takingId === match.medicationId ? "Logging…" : "Take this"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {result.usedBefore.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-zinc-900">You&apos;ve used before</h2>
              <ul className="flex flex-col gap-2">
                {result.usedBefore.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded border border-zinc-200 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-zinc-900">{entry.brandName}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(entry.takenAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-teal-800">
                      {entry.compartment != null ? `#${entry.compartment}` : "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
