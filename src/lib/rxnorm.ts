// RxNorm name normalization (NIH RxNav approximate-match).
// Turns messy user/scanner input (misspellings, brands, partials) into a
// canonical drug name + RxCUI before we query openFDA.

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
    }>;
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
 */
export async function normalizeDrugName(
  query: string,
): Promise<RxNormMatch | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const approxUrl = new URL(
    "https://rxnav.nlm.nih.gov/REST/approximateTerm.json",
  );
  approxUrl.searchParams.set("term", trimmed);
  approxUrl.searchParams.set("maxEntries", "5");

  const approxResponse = await fetch(approxUrl.toString(), {
    // Fresh data for demos; avoid stale spelling matches in prod cache later.
    cache: "no-store",
  });

  if (!approxResponse.ok) {
    throw new Error(`RxNorm approximateTerm failed (${approxResponse.status})`);
  }

  const approxData = (await approxResponse.json()) as ApproximateTermResponse;
  const candidates = approxData.approximateGroup?.candidate ?? [];
  const topRxcui = candidates.find((c) => c.rxcui)?.rxcui;

  if (!topRxcui) {
    return null;
  }

  // Prefer a short brand name (BN) when available — openFDA brand_name searches match these best.
  const brandName = await fetchBrandName(topRxcui);
  if (brandName) {
    return { rxcui: topRxcui, normalizedName: brandName };
  }

  // Fall back to the RxNorm concept name (may include strength/form).
  const conceptName = await fetchConceptName(topRxcui);
  if (conceptName) {
    return {
      rxcui: topRxcui,
      normalizedName: simplifyConceptName(conceptName),
    };
  }

  return null;
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

  // Drop strength / form tokens so openFDA brand/generic search has a chance.
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
