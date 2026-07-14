// Shared TypeScript types for drug label results returned by our search API.

export type ProductType = "OTC" | "PRESCRIPTION" | "UNKNOWN";

export type DrugResult = {
  brandName: string;
  genericName: string | null;
  productType: ProductType;
  purpose: string | null;
  indications: string | null;
  warnings: string | null;
  dosage: string | null;
  /** Canonical name from RxNorm (helps explain what the query matched). */
  normalizedName: string | null;
  rxcui: string | null;
};

export type CabinetMatch = {
  compartment: number | null;
  status: string;
};
