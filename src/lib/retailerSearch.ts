// Build retailer search URLs for cabinet OTC restocking (external hop only).

export type Retailer = "amazon" | "walmart" | "target";

/** Brand + optional dosage strength for a retailer search query. */
export function buildReorderQuery(
  brandName: string,
  dosage?: string | null,
): string {
  const brand = brandName.trim();
  const strength = dosage?.trim() ?? "";
  if (!brand) return strength;
  if (!strength) return brand;
  return `${brand} ${strength}`;
}

export function retailerSearchUrl(retailer: Retailer, query: string): string {
  const q = query.trim();
  const encoded = encodeURIComponent(q);
  switch (retailer) {
    case "amazon":
      return `https://www.amazon.com/s?k=${encoded}`;
    case "walmart":
      return `https://www.walmart.com/search?q=${encoded}`;
    case "target":
      return `https://www.target.com/s?searchTerm=${encoded}`;
  }
}

/** Cross-retailer Instacart search (fallback when shopping-list API isn’t configured). */
export function instacartWebSearchUrl(query: string): string {
  return `https://www.instacart.com/store/s?k=${encodeURIComponent(query.trim())}`;
}
