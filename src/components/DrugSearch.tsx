"use client";

// Home search: cabinet first. FDA catalog is opt-in, short, and name-only (pill variant).

import { InstacartReorderButton } from "@/components/InstacartReorderButton";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { useOffline } from "@/components/OfflineProvider";
import {
  fetchCachedCabinet,
  searchCabinetLocally,
} from "@/lib/cabinetLocal";
import {
  purposeOneLine,
  refineCatalogResults,
} from "@/lib/drugSearchResults";
import type { DrugResult } from "@/lib/types";
import Link from "next/link";
import { FormEvent, useState } from "react";

type CabinetHit = {
  id: number;
  brandName: string;
  genericName: string | null;
  productType: string;
  purpose: string | null;
  compartment: number | null;
  outOfCabinet: boolean;
};

type CabinetSearchResponse = {
  query: string;
  results: CabinetHit[];
  error?: string;
};

type FdaSearchResponse = {
  query: string;
  normalizedName: string | null;
  rxcui: string | null;
  results: DrugResult[];
  error?: string;
};

const CATALOG_LIMIT_PILL = 5;
const CATALOG_LIMIT_DEFAULT = 25;

export function DrugSearch({ variant = "default" }: { variant?: "default" | "pill" }) {
  const slim = variant === "pill";
  const { online } = useOffline();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [cabinetResults, setCabinetResults] = useState<CabinetHit[] | null>(null);
  const [catalogResults, setCatalogResults] = useState<DrugResult[] | null>(null);
  const [normalizedName, setNormalizedName] = useState<string | null>(null);
  const [cabinetLoading, setCabinetLoading] = useState(false);
  const [fdaLoading, setFdaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fdaNeedsConnection, setFdaNeedsConnection] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  async function searchCabinet(trimmed: string): Promise<CabinetHit[]> {
    try {
      if (!navigator.onLine) {
        const meds = await fetchCachedCabinet();
        if (!meds) {
          setCabinetResults([]);
          return [];
        }
        const results = searchCabinetLocally(meds, trimmed);
        setCabinetResults(results);
        return results;
      }

      const response = await fetch(
        `/api/cabinet/search?q=${encodeURIComponent(trimmed)}`,
      );
      const data = (await response.json()) as CabinetSearchResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Cabinet search failed.");
      }
      setCabinetResults(data.results);
      return data.results;
    } catch {
      setCabinetResults([]);
      return [];
    } finally {
      setCabinetLoading(false);
    }
  }

  async function fetchCatalog(trimmed: string, owned: CabinetHit[]) {
    setFdaLoading(true);
    setFdaNeedsConnection(false);
    setError(null);
    setNormalizedName(null);

    if (!navigator.onLine) {
      setFdaNeedsConnection(true);
      setCatalogResults([]);
      setFdaLoading(false);
      return;
    }

    try {
      const limit = slim ? CATALOG_LIMIT_PILL : CATALOG_LIMIT_DEFAULT;
      const response = await fetch(
        `/api/drugs/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
      );
      const data = (await response.json()) as FdaSearchResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Search failed. Please try again.");
      }
      setNormalizedName(data.normalizedName);
      const refined = refineCatalogResults(
        data.results,
        trimmed,
        owned.map((med) => ({
          brandName: med.brandName,
          genericName: med.genericName,
        })),
      );
      setCatalogResults(slim ? refined.slice(0, CATALOG_LIMIT_PILL) : refined);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not reach the search API.";
      setError(message);
      setCatalogResults([]);
    } finally {
      setFdaLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setSubmittedQuery(trimmed);
    setError(null);
    setFdaNeedsConnection(false);
    setCabinetResults(null);
    setCatalogResults(null);
    setNormalizedName(null);
    setShowCatalog(false);
    setCabinetLoading(true);
    setFdaLoading(false);

    await searchCabinet(trimmed);
  }

  async function openCatalogLookup() {
    if (!submittedQuery.trim()) return;
    setShowCatalog(true);
    if (catalogResults !== null || fdaLoading) return;
    await fetchCatalog(submittedQuery.trim(), cabinetResults ?? []);
  }

  const hasSearched = submittedQuery.length > 0;
  const cabinetReady = cabinetResults !== null;
  const catalogReady = catalogResults !== null;
  const cabinetCount = cabinetResults?.length ?? 0;
  const catalogCount = catalogResults?.length ?? 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {slim ? (
          <label htmlFor="drug-search" className="sr-only">
            Search your cabinet
          </label>
        ) : (
          <label htmlFor="drug-search" className="text-sm font-medium text-zinc-700">
            Search medications
          </label>
        )}
        <div className="flex items-center gap-2">
          <input
            id="drug-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={slim ? "Search your cabinet…" : "Search medicines…"}
            className={
              slim
                ? "min-h-12 min-w-0 flex-1 rounded-full border-0 bg-[var(--surface-tint)] px-5 text-base text-[var(--text-primary)] outline-none ring-0 transition duration-150 placeholder:text-[var(--text-secondary)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--primary)]/25"
                : "min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-base text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            }
            autoComplete="off"
            enterKeyHint="search"
          />
          <button
            type="submit"
            disabled={cabinetLoading || !query.trim()}
            className={
              slim
                ? "inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center btn-primary-fill rounded-full text-sm font-semibold transition duration-150 ease-out active:scale-95 disabled:opacity-50"
                : "btn-primary-fill shrink-0 rounded-lg px-4 py-3 text-sm font-semibold transition duration-150 ease-out active:scale-[0.98] disabled:opacity-50"
            }
          >
            {cabinetLoading ? "…" : slim ? "Go" : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}

      {hasSearched &&
        !slim &&
        normalizedName &&
        normalizedName.toLowerCase() !== submittedQuery.toLowerCase() && (
          <p className="text-sm text-zinc-600">
            Normalized via RxNorm to{" "}
            <span className="font-semibold text-zinc-900">{normalizedName}</span>
          </p>
        )}

      {cabinetLoading && (
        <p className="text-sm text-zinc-500" role="status">
          Checking your cabinet…
        </p>
      )}

      {cabinetReady && cabinetCount > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            In your cabinet
          </h2>
          <ul className="flex flex-col gap-2">
            {cabinetResults!.map((med) => (
              <li key={med.id}>
                <Link
                  href={`/drugs/${encodeURIComponent(med.brandName)}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-[var(--brand-sage-deep)] hover:bg-[var(--brand-sage)]/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{med.brandName}</p>
                    {med.genericName ? (
                      <p className="truncate text-sm text-zinc-500">({med.genericName})</p>
                    ) : null}
                    {!slim && (
                      <>
                        <p className="mt-1 truncate text-sm text-zinc-600">
                          {purposeOneLine(med.purpose)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-zinc-800">
                          {med.compartment != null
                            ? `Compartment ${med.compartment}`
                            : "Compartment unassigned"}
                          {med.outOfCabinet && (
                            <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                              Out
                            </span>
                          )}
                        </p>
                      </>
                    )}
                    {slim && med.compartment != null && (
                      <p className="mt-1 text-sm text-zinc-600">
                        Bay {med.compartment}
                        {med.outOfCabinet ? " · out" : ""}
                      </p>
                    )}
                  </div>
                  {!slim && <ProductTypeBadge productType={med.productType} />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasSearched && cabinetReady && cabinetCount === 0 && !showCatalog && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Nothing in your cabinet matches “{submittedQuery}”.
          </p>
          <button
            type="button"
            onClick={() => void openCatalogLookup()}
            disabled={fdaLoading}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition active:scale-[0.99] disabled:opacity-50"
          >
            Look up outside cabinet
          </button>
        </div>
      )}

      {hasSearched && cabinetReady && cabinetCount > 0 && !showCatalog && (
        <button
          type="button"
          onClick={() => void openCatalogLookup()}
          disabled={fdaLoading}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:border-[var(--brand-sage-deep)] disabled:opacity-50"
        >
          Look up outside cabinet
        </button>
      )}

      {showCatalog && (
        <section className="flex flex-col gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Outside your cabinet
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Have the bottle? Scanning it is faster.
            </p>
          </div>

          {fdaNeedsConnection && (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-center text-sm text-amber-950"
              role="status"
            >
              Catalog search needs a connection. Reconnect to look up medications
              outside your cabinet.
            </p>
          )}

          {fdaLoading && !fdaNeedsConnection && (
            <p className="text-sm text-zinc-500" role="status">
              Looking up…
            </p>
          )}

          {catalogReady &&
            !fdaLoading &&
            !fdaNeedsConnection &&
            catalogCount === 0 && (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-600">
                No medications found for “{submittedQuery}” — check the spelling on the
                label.
              </p>
            )}

          {catalogReady && catalogCount > 0 && (
            <ul className="flex flex-col gap-2">
              {catalogResults!.map((drug, index) => (
                <li
                  key={`${drug.brandName}-${drug.genericName}-${index}`}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-[var(--brand-sage-deep)] hover:bg-[var(--brand-sage)]/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/drugs/${encodeURIComponent(drug.brandName)}?from=catalog`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate font-semibold text-zinc-900">
                        {drug.brandName}
                        {drug.genericName ? (
                          <span className="ml-1 text-sm font-normal text-zinc-500">
                            ({drug.genericName})
                          </span>
                        ) : null}
                      </p>
                      {!slim && (
                        <p className="mt-1 truncate text-sm text-zinc-600">
                          {purposeOneLine(drug.purpose)}
                        </p>
                      )}
                    </Link>
                    {!slim && <ProductTypeBadge productType={drug.productType} />}
                  </div>
                  {!slim && drug.productType === "OTC" && online && (
                    <div className="mt-3 flex flex-col gap-1.5 border-t border-zinc-100 pt-3">
                      <InstacartReorderButton
                        brandName={drug.brandName}
                        dosage={drug.dosage}
                        label="Find on Instacart"
                      />
                      <p className="text-[11px] leading-snug text-zinc-500">
                        Not in your cabinet — opens Instacart. Pillio doesn&apos;t
                        sell or recommend products.
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
