"use client";

// Symptom lookup: optional NL parse (extract-only) → deterministic OTC label match.

import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { ReconnectHint } from "@/components/ReconnectHint";
import { useOffline } from "@/components/OfflineProvider";
import { VoiceMicButton } from "@/components/VoiceMicButton";
import {
  fetchCachedCabinet,
  matchSymptomsAgainstCabinet,
} from "@/lib/cabinetLocal";
import { RECONNECT_TO_CHANGE } from "@/lib/offline";
import {
  looksLikeNaturalLanguage,
  resolveSymptomsForMatch,
} from "@/lib/symptomParse";
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

type SymptomGroup = {
  symptom: string;
  matches: Match[];
  usedBefore: UsedBefore[];
};

export function SymptomSearch() {
  const { online } = useOffline();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSymptoms, setActiveSymptoms] = useState<string[]>([]);
  const [groups, setGroups] = useState<SymptomGroup[] | null>(null);
  const [takeMessage, setTakeMessage] = useState<string | null>(null);
  const [takingId, setTakingId] = useState<number | null>(null);
  const [recent, setRecent] = useState<UsedBefore[]>([]);

  async function loadRecent() {
    if (!navigator.onLine) return;
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

  async function fetchMatches(symptom: string): Promise<SearchResponse | null> {
    if (!navigator.onLine) {
      const meds = await fetchCachedCabinet();
      if (!meds) {
        throw new Error(
          "Offline and no cached cabinet yet. Open Pillio online once, then try again.",
        );
      }
      const matches = matchSymptomsAgainstCabinet(meds, symptom);
      return { symptom, matches, usedBefore: [] };
    }

    const response = await fetch(
      `/api/symptoms?q=${encodeURIComponent(symptom)}`,
    );
    const data = (await response.json()) as SearchResponse;
    if (!response.ok) {
      throw new Error(data.error ?? "Search failed.");
    }
    return data;
  }

  /** Try NL extract; on any failure return null so caller uses raw text. */
  async function tryParseSymptoms(text: string): Promise<string[] | null> {
    if (!navigator.onLine) return null;
    try {
      const response = await fetch("/api/symptoms/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { symptoms?: string[] };
      if (!Array.isArray(data.symptoms)) return null;
      return data.symptoms
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim().toLowerCase());
    } catch {
      return null;
    }
  }

  async function matchSymptoms(
    symptoms: string[],
    options?: { preserveTakeMessage?: boolean },
  ) {
    const unique = [...new Set(symptoms.map((s) => s.trim()).filter(Boolean))];
    setActiveSymptoms(unique);
    setIsLoading(true);
    setError(null);
    if (!options?.preserveTakeMessage) {
      setTakeMessage(null);
    }
    setGroups(null);

    if (unique.length === 0) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    try {
      const results = await Promise.all(unique.map((s) => fetchMatches(s)));
      setGroups(
        results.map((data, i) => ({
          symptom: unique[i]!,
          matches: data?.matches ?? [],
          usedBefore: data?.usedBefore ?? [],
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the symptom API.");
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function runFromInput(raw: string, options?: { preserveTakeMessage?: boolean }) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Single-word → direct label match (no AI).
    if (!looksLikeNaturalLanguage(trimmed)) {
      await matchSymptoms([trimmed.toLowerCase()], options);
      return;
    }

    // Multi-word: extract-only parse, then deterministic match per term.
    // PRODUCT SAFETY: AI never picks meds — only symptom strings for label search.
    const parsed = await tryParseSymptoms(trimmed);
    const symptoms = resolveSymptomsForMatch(trimmed, parsed);
    await matchSymptoms(symptoms, options);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await runFromInput(query);
  }

  async function removeSymptom(term: string) {
    const next = activeSymptoms.filter((s) => s !== term);
    await matchSymptoms(next);
  }

  async function handleTake(match: Match, symptom: string) {
    if (!navigator.onLine) {
      setTakeMessage(RECONNECT_TO_CHANGE);
      return;
    }
    setTakingId(match.medicationId);
    setTakeMessage(null);
    try {
      const response = await fetch("/api/symptoms/take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: match.medicationId,
          symptom,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setTakeMessage(data.error ?? "Could not log this dose.");
        return;
      }
      await matchSymptoms(activeSymptoms, { preserveTakeMessage: true });
      await loadRecent();
      setTakeMessage(`Logged taking ${match.brandName} for “${symptom}”.`);
    } catch {
      setTakeMessage("Network error while logging.");
    } finally {
      setTakingId(null);
    }
  }

  const hasResults = groups != null;

  return (
    <div className="flex flex-col gap-6">
      {!online && <ReconnectHint />}
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
            void runFromInput(text);
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

      {activeSymptoms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Searching for:
          </span>
          {activeSymptoms.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => void removeSymptom(term)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-tint)] px-3 py-1.5 text-sm font-medium text-[var(--otc-text)] transition duration-150 active:scale-95"
              aria-label={`Remove ${term}`}
            >
              {term}
              <span aria-hidden className="text-[var(--text-secondary)]">
                ✕
              </span>
            </button>
          ))}
        </div>
      )}

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

      {hasResults && (
        <div className="flex flex-col gap-8">
          {groups!.length === 0 ? (
            <p className="rounded-2xl bg-[var(--accent-cream)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
              Nothing to search — add a symptom.
            </p>
          ) : (
            groups!.map((group) => (
              <section key={group.symptom} className="flex flex-col gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  In your cabinet · {group.symptom}
                </h2>

                {group.matches.length === 0 ? (
                  <p className="rounded-2xl bg-[var(--accent-cream)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                    Nothing in your cabinet matches “{group.symptom}” on the label.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {group.matches.map((match) => (
                      <li
                        key={`${group.symptom}-${match.medicationId}`}
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
                          onClick={() => handleTake(match, group.symptom)}
                          disabled={!online || takingId === match.medicationId}
                          className="mt-4 min-h-11 rounded-2xl btn-primary-fill px-4 text-sm font-semibold transition duration-150 ease-out disabled:opacity-50"
                        >
                          {takingId === match.medicationId
                            ? "Logging…"
                            : "I took this"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {group.usedBefore.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
                      Past takes for “{group.symptom}”
                    </h3>
                    <UsageList entries={group.usedBefore} />
                  </div>
                )}
              </section>
            ))
          )}
        </div>
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
