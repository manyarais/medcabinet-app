"use client";

// Home-page search UI: calls GET /api/drugs/search and lists results.
// Kept as a client component so we can show loading/error states while openFDA responds.

import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import type { DrugResult } from "@/lib/types";
import Link from "next/link";
import { FormEvent, useState } from "react";

type SearchApiResponse = {
  query: string;
  normalizedName: string | null;
  rxcui: string | null;
  results: DrugResult[];
  error?: string;
};

export function DrugSearch() {
  const [query, setQuery] = useState("");
  const [normalizedName, setNormalizedName] = useState<string | null>(null);
  const [results, setResults] = useState<DrugResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setResults(null);
    setNormalizedName(null);

    try {
      const response = await fetch(
        `/api/drugs/search?q=${encodeURIComponent(trimmed)}`,
      );
      const data = (await response.json()) as SearchApiResponse;

      if (!response.ok) {
        setError(data.error ?? "Search failed. Please try again.");
        return;
      }

      setNormalizedName(data.normalizedName);
      setResults(data.results);
    } catch {
      setError("Could not reach the search API. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="drug-search" className="text-sm font-medium text-zinc-700">
          Search medications
        </label>
        <div className="flex gap-2">
          <input
            id="drug-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Tylenol, Advil, Tylenl"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base text-zinc-900 outline-none ring-teal-600 focus:ring-2"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="shrink-0 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-teal-700/50"
          >
            {isLoading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {isLoading && (
        <p className="text-sm text-zinc-500" role="status">
          Looking up via RxNorm + openFDA… this can take a few seconds.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {results && normalizedName && normalizedName.toLowerCase() !== query.trim().toLowerCase() && (
        <p className="text-sm text-zinc-600">
          Normalized via RxNorm to{" "}
          <span className="font-semibold text-zinc-900">{normalizedName}</span>
        </p>
      )}

      {results && results.length === 0 && (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-600">
          No label results found for “{query.trim()}”. Try another spelling or brand name.
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((drug, index) => {
            const slug = encodeURIComponent(drug.brandName);
            return (
              <li key={`${drug.brandName}-${drug.genericName}-${index}`}>
                <Link
                  href={`/drugs/${slug}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-teal-300 hover:bg-teal-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{drug.brandName}</p>
                    <p className="truncate text-sm text-zinc-500">
                      {drug.genericName ?? "Generic name unavailable"}
                    </p>
                  </div>
                  <ProductTypeBadge productType={drug.productType} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
