// RxNorm name normalization (NIH RxNav approximate-match + spelling).
// Turns messy user/scanner input (misspellings, brands, partials) into a
// canonical drug name + RxCUI before we query openFDA. No AI — RxNorm only.

export type RxNormMatch = {
  rxcui: string;
  normalizedName: string;
};

type ApproximateTermResponse = {
  approximateGroup?: {
    candidate?: Array<{
      rxcui?: string;
      score?: string;
      rank?: string;
      name?: string;
    }>;
  };
};

type SpellingSuggestionsResponse = {
  suggestionGroup?: {
    suggestionList?: {
      suggestion?: string | string[];
    };
  };
};

type PropertiesResponse = {
  properties?: {
    rxcui?: string;
    name?: string;
  };
};

type RelatedResponse = {
  relatedGroup?: {
    conceptGroup?: Array<{
      tty?: string;
      conceptProperties?: Array<{
        rxcui?: string;
        name?: string;
        synonym?: string;
      }>;
    }>;
  };
};

/**
 * Resolve a free-text drug name to a canonical RxNorm name + RxCUI.
 * Returns null if RxNorm finds nothing useful.
 *
 * Order: approximateTerm → spellingSuggestions → short vowel-insertion
 * variants re-run through approximateTerm (covers cases like "Advl"→Advil
 * that RxNorm's approximate endpoint alone misses).
 */
export async function normalizeDrugName(
  query: string,
): Promise<RxNormMatch | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const direct = await matchApproximateTerm(trimmed);
  if (direct) return direct;

  const suggestions = await fetchSpellingSuggestions(trimmed);
  for (const suggestion of suggestions) {
    if (suggestion.toLowerCase() === trimmed.toLowerCase()) continue;
    const fromSuggestion = await matchApproximateTerm(suggestion);
    if (fromSuggestion) return fromSuggestion;
    // Spelling API sometimes returns the brand already.
    const asBrand = await resolveBrandFromName(suggestion);
    if (asBrand) return asBrand;
  }

  // Short typos with a missing vowel (e.g. Advl) often fail both endpoints.
  if (trimmed.length >= 3 && trimmed.length <= 8) {
    for (const variant of vowelInsertionVariants(trimmed)) {
      const hit = await matchApproximateTerm(variant);
      if (hit) return hit;
    }
  }

  return null;
}

async function matchApproximateTerm(term: string): Promise<RxNormMatch | null> {
  const approxUrl = new URL(
    "https://rxnav.nlm.nih.gov/REST/approximateTerm.json",
  );
  approxUrl.searchParams.set("term", term);
  approxUrl.searchParams.set("maxEntries", "5");

  const approxResponse = await fetch(approxUrl.toString(), {
    cache: "no-store",
  });

  if (!approxResponse.ok) {
    throw new Error(`RxNorm approximateTerm failed (${approxResponse.status})`);
  }

  const approxData = (await approxResponse.json()) as ApproximateTermResponse;
  const candidates = approxData.approximateGroup?.candidate ?? [];
  const top = candidates.find((c) => c.rxcui);
  if (!top?.rxcui) return null;

  // Prefer a short brand name (BN) when available — openFDA brand_name searches match these best.
  const brandName = await fetchBrandName(top.rxcui);
  if (brandName) {
    return { rxcui: top.rxcui, normalizedName: brandName };
  }

  if (top.name?.trim()) {
    return {
      rxcui: top.rxcui,
      normalizedName: simplifyConceptName(top.name.trim()),
    };
  }

  const conceptName = await fetchConceptName(top.rxcui);
  if (conceptName) {
    return {
      rxcui: top.rxcui,
      normalizedName: simplifyConceptName(conceptName),
    };
  }

  return null;
}

async function fetchSpellingSuggestions(term: string): Promise<string[]> {
  const url = new URL(
    "https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json",
  );
  url.searchParams.set("name", term);

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as SpellingSuggestionsResponse;
    const raw = data.suggestionGroup?.suggestionList?.suggestion;
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    return list.map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Try approximateTerm on the suggestion as an exact-ish brand string. */
async function resolveBrandFromName(name: string): Promise<RxNormMatch | null> {
  return matchApproximateTerm(name);
}

/**
 * Insert one vowel between letters (Advl → Advil). Cap API fan-out.
 * Exported for unit tests.
 */
export function vowelInsertionVariants(term: string): string[] {
  const vowels = ["a", "e", "i", "o", "u"];
  const out: string[] = [];
  const lower = term.toLowerCase();
  for (let i = 1; i < lower.length; i++) {
    for (const v of vowels) {
      out.push(lower.slice(0, i) + v + lower.slice(i));
    }
  }
  // Prefer variants closest in length to common brand shapes; de-dupe, cap.
  return [...new Set(out)].slice(0, 15);
}

async function fetchBrandName(rxcui: string): Promise<string | null> {
  const url = new URL(
    `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/related.json`,
  );
  url.searchParams.set("tty", "BN");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) return null;

  const data = (await response.json()) as RelatedResponse;
  const groups = data.relatedGroup?.conceptGroup ?? [];

  for (const group of groups) {
    const name = group.conceptProperties?.find((p) => p.name)?.name;
    if (name) return name;
  }

  return null;
}

async function fetchConceptName(rxcui: string): Promise<string | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/properties.json`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const data = (await response.json()) as PropertiesResponse;
  return data.properties?.name ?? null;
}

/**
 * RxNorm concept names often look like "acetaminophen 500 MG Oral Tablet [Tylenol]".
 * Prefer the brand in brackets when present; otherwise take the leading ingredient words.
 */
function simplifyConceptName(name: string): string {
  const bracketMatch = name.match(/\[([^\]]+)\]/);
  if (bracketMatch?.[1]) {
    return bracketMatch[1].trim();
  }

  const withoutDose = name
    .replace(/\b\d+(\.\d+)?\s?(mg|mcg|g|ml|%)\b/gi, "")
    .replace(
      /\b(oral|tablet|capsule|caplet|chewable|solution|suspension|syrup|liquid)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  return withoutDose || name;
}
