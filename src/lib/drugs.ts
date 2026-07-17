// Drug lookup orchestration: RxNorm normalize → openFDA label search.
// DailyMed fallback is intentionally omitted until Phase 4 (scan endpoint).

import { searchOpenFda } from "@/lib/openfda";
import { normalizeDrugName } from "@/lib/rxnorm";
import type { DrugResult } from "@/lib/types";

export type DrugSearchResponse = {
  query: string;
  normalizedName: string | null;
  rxcui: string | null;
  results: DrugResult[];
};

export async function lookupDrugs(
  query: string,
  options?: { limit?: number },
): Promise<DrugSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: trimmed, normalizedName: null, rxcui: null, results: [] };
  }

  const limit = options?.limit ?? 10;
  const rxnorm = await normalizeDrugName(trimmed);
  const searchName = rxnorm?.normalizedName ?? trimmed;

  const results = await searchOpenFda(searchName, {
    limit,
    normalizedName: rxnorm?.normalizedName ?? null,
    rxcui: rxnorm?.rxcui ?? null,
  });

  // If normalization found a name but openFDA returned nothing, try the raw query once.
  if (results.length === 0 && rxnorm && rxnorm.normalizedName !== trimmed) {
    const fallbackResults = await searchOpenFda(trimmed, {
      limit,
      normalizedName: rxnorm.normalizedName,
      rxcui: rxnorm.rxcui,
    });

    return {
      query: trimmed,
      normalizedName: rxnorm.normalizedName,
      rxcui: rxnorm.rxcui,
      results: fallbackResults,
    };
  }

  return {
    query: trimmed,
    normalizedName: rxnorm?.normalizedName ?? null,
    rxcui: rxnorm?.rxcui ?? null,
    results,
  };
}
