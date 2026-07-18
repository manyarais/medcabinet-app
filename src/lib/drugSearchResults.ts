// Post-process openFDA label hits into deduped, ranked "products" for search UI.
// Does not change lookupDrugs / searchOpenFda exports used by the scanner teammate.

import type { DrugResult } from "@/lib/types";

export type OwnedMedicationName = {
  brandName: string;
  genericName: string | null;
};

function normalizeKeyPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function completenessScore(drug: DrugResult): number {
  let score = 0;
  if (drug.brandName && drug.brandName !== "Unknown") score += 2;
  if (drug.genericName) score += 2;
  if (drug.purpose?.trim()) score += 2;
  if (drug.indications?.trim()) score += 2;
  if (drug.warnings?.trim()) score += 1;
  if (drug.dosage?.trim()) score += 1;
  return score;
}

/**
 * Product identity for dedupe: full brand + generic.
 * Keeps "Advil" vs "Advil PM" as separate products (brand-family collapse was too aggressive).
 */
function productKey(drug: DrugResult): string {
  const brand = normalizeKeyPart(drug.brandName) || "unknown-brand";
  const generic = normalizeKeyPart(drug.genericName ?? "") || "unknown-generic";
  return `${brand}::${generic}`;
}

const INSTITUTIONAL_RE =
  /\b(institutional|repackag|hospital unit|unit dose|for hospital|pharmacy bulk|not for retail)\b/i;

/** Drop obvious institutional / repackager-style label filings when detectable. */
export function looksInstitutional(drug: DrugResult): boolean {
  const blob = [drug.brandName, drug.purpose, drug.indications, drug.warnings]
    .filter(Boolean)
    .join(" ");
  return INSTITUTIONAL_RE.test(blob);
}

/** Only hide the exact cabinet brand from catalog — keep sibling products (Advil PM, etc.). */
export function isOwnedProduct(
  drug: DrugResult,
  owned: OwnedMedicationName[],
): boolean {
  const drugBrand = normalizeKeyPart(drug.brandName);
  if (!drugBrand) return false;
  return owned.some((med) => normalizeKeyPart(med.brandName) === drugBrand);
}

/**
 * Collapse label filings into products, rank for search, and drop owned / institutional hits.
 */
export function refineCatalogResults(
  results: DrugResult[],
  query: string,
  owned: OwnedMedicationName[],
): DrugResult[] {
  const q = normalizeKeyPart(query);
  const bestByKey = new Map<string, DrugResult>();

  for (const drug of results) {
    if (looksInstitutional(drug)) continue;
    if (isOwnedProduct(drug, owned)) continue;

    const key = productKey(drug);
    const existing = bestByKey.get(key);
    if (!existing || completenessScore(drug) > completenessScore(existing)) {
      bestByKey.set(key, drug);
    }
  }

  const products = [...bestByKey.values()];

  products.sort((a, b) => {
    const aExact = normalizeKeyPart(a.brandName) === q ? 1 : 0;
    const bExact = normalizeKeyPart(b.brandName) === q ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    const aNorm = normalizeKeyPart(a.brandName);
    const bNorm = normalizeKeyPart(b.brandName);
    const aStarts = aNorm.startsWith(q) ? 1 : 0;
    const bStarts = bNorm.startsWith(q) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;

    const aContains = aNorm.includes(q) ? 1 : 0;
    const bContains = bNorm.includes(q) ? 1 : 0;
    if (aContains !== bContains) return bContains - aContains;

    const aOtc = a.productType === "OTC" ? 1 : 0;
    const bOtc = b.productType === "OTC" ? 1 : 0;
    if (aOtc !== bOtc) return bOtc - aOtc;

    return completenessScore(b) - completenessScore(a);
  });

  return products;
}

/** One-line purpose for recognition cards. */
export function purposeOneLine(purpose: string | null, max = 90): string {
  if (!purpose?.trim()) return "Purpose not listed on this label.";
  const line = purpose.replace(/\s+/g, " ").trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1).trimEnd()}…`;
}
