// Physical cabinet layout — single source of truth.
// Edit COMPARTMENTS when the hardware changes; helpers derive from this list.

export type CompartmentSize = "medium" | "thin" | "big";

export type CompartmentConfig = {
  number: number;
  size: CompartmentSize;
  /** Only the scanner bay is non-assignable. */
  isScanner: boolean;
  module: "A" | "B";
};

/**
 * Two modules, 18 bays total.
 * Module A = 1–9, Module B = 10–18.
 * Medium: 1–6, 10–15 | Thin: 7–8, 16–17 | Big: 9, 18
 * Scanner = 18 only (9 is assignable big storage).
 */
export const COMPARTMENTS: CompartmentConfig[] = [
  // Module A
  { number: 1, size: "medium", isScanner: false, module: "A" },
  { number: 2, size: "medium", isScanner: false, module: "A" },
  { number: 3, size: "medium", isScanner: false, module: "A" },
  { number: 4, size: "medium", isScanner: false, module: "A" },
  { number: 5, size: "medium", isScanner: false, module: "A" },
  { number: 6, size: "medium", isScanner: false, module: "A" },
  { number: 7, size: "thin", isScanner: false, module: "A" },
  { number: 8, size: "thin", isScanner: false, module: "A" },
  { number: 9, size: "big", isScanner: false, module: "A" },
  // Module B
  { number: 10, size: "medium", isScanner: false, module: "B" },
  { number: 11, size: "medium", isScanner: false, module: "B" },
  { number: 12, size: "medium", isScanner: false, module: "B" },
  { number: 13, size: "medium", isScanner: false, module: "B" },
  { number: 14, size: "medium", isScanner: false, module: "B" },
  { number: 15, size: "medium", isScanner: false, module: "B" },
  { number: 16, size: "thin", isScanner: false, module: "B" },
  { number: 17, size: "thin", isScanner: false, module: "B" },
  { number: 18, size: "big", isScanner: true, module: "B" },
];

export const TOTAL_COMPARTMENTS = COMPARTMENTS.length;

export const SCANNER_COMPARTMENT =
  COMPARTMENTS.find((c) => c.isScanner)?.number ?? 18;

const byNumber = new Map(COMPARTMENTS.map((c) => [c.number, c]));

export function getCompartmentConfig(
  compartment: number,
): CompartmentConfig | undefined {
  return byNumber.get(compartment);
}

export function sizeForCompartment(compartment: number): CompartmentSize {
  const config = getCompartmentConfig(compartment);
  if (!config) {
    throw new Error(`Unknown compartment number: ${compartment}`);
  }
  return config.size;
}

export function isScannerCompartment(compartment: number): boolean {
  return getCompartmentConfig(compartment)?.isScanner === true;
}

/** Compartment numbers that can hold a medication (excludes scanner). */
export function assignableCompartments(): number[] {
  return COMPARTMENTS.filter((c) => !c.isScanner).map((c) => c.number);
}

export function isValidAssignableCompartment(compartment: number): boolean {
  const config = getCompartmentConfig(compartment);
  return config != null && !config.isScanner;
}

export function compartmentsForModule(module: "A" | "B"): CompartmentConfig[] {
  return COMPARTMENTS.filter((c) => c.module === module);
}
