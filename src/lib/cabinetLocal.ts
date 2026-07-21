/** Offline helpers that search/match against a cached cabinet GET payload. */

import {
  matchOtcCabinetMeds,
  type CabinetMedForMatch,
  type SymptomMatchResult,
} from "@/lib/symptomMatch";

export type CachedCabinetMed = {
  id: number;
  brandName: string;
  genericName: string | null;
  productType: string;
  purpose: string | null;
  indications?: string;
  compartment: number | null;
  outOfCabinet: boolean;
  status?: string;
};

export type CabinetListResponse = {
  medications: CachedCabinetMed[];
};

export async function fetchCachedCabinet(): Promise<CachedCabinetMed[] | null> {
  try {
    const response = await fetch("/api/cabinet");
    if (!response.ok) return null;
    const data = (await response.json()) as CabinetListResponse;
    if (!Array.isArray(data.medications)) return null;
    return data.medications;
  } catch {
    return null;
  }
}

export function searchCabinetLocally(
  meds: CachedCabinetMed[],
  query: string,
): Array<{
  id: number;
  brandName: string;
  genericName: string | null;
  productType: string;
  purpose: string | null;
  compartment: number | null;
  outOfCabinet: boolean;
}> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return meds
    .filter((med) => (med.status ?? "active") === "active")
    .filter((med) => {
      const brand = med.brandName.toLowerCase();
      const generic = med.genericName?.toLowerCase() ?? "";
      return brand.includes(needle) || generic.includes(needle);
    })
    .map((med) => ({
      id: med.id,
      brandName: med.brandName,
      genericName: med.genericName,
      productType: med.productType,
      purpose: med.purpose,
      compartment: med.compartment,
      outOfCabinet: med.outOfCabinet,
    }));
}

export function matchSymptomsAgainstCabinet(
  meds: CachedCabinetMed[],
  symptom: string,
): SymptomMatchResult[] {
  const forMatch: CabinetMedForMatch[] = meds.map((med) => ({
    id: med.id,
    brandName: med.brandName,
    productType: med.productType,
    compartment: med.compartment,
    outOfCabinet: med.outOfCabinet,
    purpose: med.purpose,
    indications: med.indications ?? "",
  }));
  return matchOtcCabinetMeds(forMatch, symptom);
}
