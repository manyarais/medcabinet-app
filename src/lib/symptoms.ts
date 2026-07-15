// Symptom matching helpers (Phase 3).
// Searches only cabinet medications' indications/purpose text.

export type SymptomMatch = {
  medicationId: number;
  brandName: string;
  productType: string;
  compartment: number | null;
  /** Snippet from purpose/indications showing why this med appeared. */
  matchExcerpt: string;
};

/**
 * Build a short excerpt around the first case-insensitive hit for `symptom`.
 */
export function excerptAroundMatch(text: string, symptom: string): string | null {
  const haystack = text.trim();
  const needle = symptom.trim();
  if (!haystack || !needle) return null;

  const lowerHay = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const index = lowerHay.indexOf(lowerNeedle);
  if (index === -1) return null;

  const padding = 40;
  const start = Math.max(0, index - padding);
  const end = Math.min(haystack.length, index + needle.length + padding);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < haystack.length ? "…" : "";
  return `${prefix}${haystack.slice(start, end).trim()}${suffix}`;
}

export function findMatchExcerpt(
  purpose: string | null,
  indications: string,
  symptom: string,
): string | null {
  if (purpose) {
    const fromPurpose = excerptAroundMatch(purpose, symptom);
    if (fromPurpose) return fromPurpose;
  }
  return excerptAroundMatch(indications, symptom);
}
