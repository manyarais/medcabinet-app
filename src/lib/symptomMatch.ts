// Pure OTC symptom matching (safe to unit-test without Prisma).
// Symptom lookup only surfaces OTC cabinet meds whose labels mention the query.

import { findMatchExcerpt } from "@/lib/symptoms";

export type CabinetMedForMatch = {
  id: number;
  brandName: string;
  productType: string;
  compartment: number | null;
  outOfCabinet: boolean;
  purpose: string | null;
  indications: string;
};

export type SymptomMatchResult = {
  medicationId: number;
  brandName: string;
  productType: string;
  compartment: number | null;
  outOfCabinet: boolean;
  matchExcerpt: string;
};

/**
 * PRODUCT SAFETY: never include PRESCRIPTION (or non-OTC) meds in symptom matches,
 * even if their label text mentions the symptom.
 */
export function matchOtcCabinetMeds(
  meds: CabinetMedForMatch[],
  symptom: string,
): SymptomMatchResult[] {
  const otcOnly = meds.filter((med) => med.productType === "OTC");

  return otcOnly
    .map((med) => {
      const excerpt = findMatchExcerpt(med.purpose, med.indications, symptom);
      if (!excerpt) return null;
      return {
        medicationId: med.id,
        brandName: med.brandName,
        productType: med.productType,
        compartment: med.compartment,
        outOfCabinet: med.outOfCabinet,
        matchExcerpt: excerpt,
      };
    })
    .filter((item): item is SymptomMatchResult => item != null);
}
