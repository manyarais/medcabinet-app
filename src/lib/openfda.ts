// openFDA drug label lookup.
// Maps inconsistent label JSON (fields may be missing; strings arrive as arrays)
// into the flat DrugResult shape used by our API and UI.

import type { DrugResult, ProductType } from "@/lib/types";

type OpenFdaLabel = {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    product_type?: string[];
  };
  purpose?: string[];
  indications_and_usage?: string[];
  warnings?: string[];
  dosage_and_administration?: string[];
};

type OpenFdaResponse = {
  results?: OpenFdaLabel[];
  error?: { code?: string; message?: string };
};

/**
 * Search openFDA labels by brand OR generic name.
 * Note: the PRD snippet used "+", which is AND in openFDA/Lucene and would
 * miss brand-only hits like Tylenol. We use OR so brand-or-generic works.
 *
 * Also includes a brand prefix wildcard (advil*) so sibling products like
 * "Advil PM" appear — exact quoted brand alone only returns that exact string.
 * (Scanner teammates: search string is additive; return type unchanged.)
 */
export async function searchOpenFda(
  name: string,
  options?: { limit?: number; normalizedName?: string | null; rxcui?: string | null },
): Promise<DrugResult[]> {
  const limit = options?.limit ?? 10;
  const escaped = escapeOpenFdaValue(name);
  const prefixToken = name
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

  const clauses = [
    `openfda.brand_name:"${escaped}"`,
    `openfda.generic_name:"${escaped}"`,
  ];
  // Prefix only for tokens long enough to avoid ultra-broad matches.
  if (prefixToken && prefixToken.length >= 3) {
    clauses.push(`openfda.brand_name:${prefixToken}*`);
  }

  const search = `(${clauses.join(" OR ")})`;

  const url = new URL("https://api.fda.gov/drug/label.json");
  url.searchParams.set("search", search);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), { cache: "no-store" });

  // openFDA returns 404 when there are zero matches — treat as empty, not an error.
  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`openFDA search failed (${response.status})`);
  }

  const data = (await response.json()) as OpenFdaResponse;
  const results = data.results ?? [];

  return results.map((label) => mapLabelToDrugResult(label, options));
}

function mapLabelToDrugResult(
  label: OpenFdaLabel,
  options?: { normalizedName?: string | null; rxcui?: string | null },
): DrugResult {
  const brandName =
    firstString(label.openfda?.brand_name) ??
    options?.normalizedName ??
    "Unknown";

  return {
    brandName,
    genericName: firstString(label.openfda?.generic_name),
    productType: mapProductType(firstString(label.openfda?.product_type)),
    purpose: joinField(label.purpose),
    indications: joinField(label.indications_and_usage),
    warnings: joinField(label.warnings),
    dosage: joinField(label.dosage_and_administration),
    normalizedName: options?.normalizedName ?? null,
    rxcui: options?.rxcui ?? null,
  };
}

/** Exported for Tier 1 unit tests (openFDA fields are inconsistent). */
export function mapProductType(raw: string | null): ProductType {
  if (!raw) return "UNKNOWN";
  const upper = raw.toUpperCase();
  if (upper.includes("OTC")) return "OTC";
  if (upper.includes("PRESCRIPTION")) return "PRESCRIPTION";
  return "UNKNOWN";
}

export function firstString(values: string[] | undefined): string | null {
  if (!values || values.length === 0) return null;
  return values[0] ?? null;
}

export function joinField(values: string[] | undefined): string | null {
  if (!values || values.length === 0) return null;
  return values.join("\n\n");
}

/** Escape quotes inside user-provided search terms for openFDA Lucene queries. */
function escapeOpenFdaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
