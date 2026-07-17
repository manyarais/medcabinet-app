// Physical cabinet layout — single source of truth.
// Edit COMPARTMENTS when the hardware changes; helpers derive from this list.

export type CompartmentSize = "medium" | "thin" | "big";

export type CompartmentConfig = {
  number: number;
  size: CompartmentSize;
  /** Reserved for a future non-assignable scanner bay (none currently). */
  isScanner: boolean;
  module: "A" | "B";
};

/**
 * Two modules, 18 bays total.
 * Module A = 1–9, Module B = 10–18.
 * Medium: 1–8, 13–14, 16–17 | Thin: 9–12 | Big: 15, 18
 */
export const COMPARTMENTS: CompartmentConfig[] = [
  // Module A
  { number: 1, size: "medium", isScanner: false, module: "A" },
  { number: 2, size: "medium", isScanner: false, module: "A" },
  { number: 3, size: "medium", isScanner: false, module: "A" },
  { number: 4, size: "medium", isScanner: false, module: "A" },
  { number: 5, size: "medium", isScanner: false, module: "A" },
  { number: 6, size: "medium", isScanner: false, module: "A" },
  { number: 7, size: "medium", isScanner: false, module: "A" },
  { number: 8, size: "medium", isScanner: false, module: "A" },
  { number: 9, size: "thin", isScanner: false, module: "A" },
  // Module B
  { number: 10, size: "thin", isScanner: false, module: "B" },
  { number: 11, size: "thin", isScanner: false, module: "B" },
  { number: 12, size: "thin", isScanner: false, module: "B" },
  { number: 13, size: "medium", isScanner: false, module: "B" },
  { number: 14, size: "medium", isScanner: false, module: "B" },
  { number: 15, size: "big", isScanner: false, module: "B" },
  { number: 16, size: "medium", isScanner: false, module: "B" },
  { number: 17, size: "medium", isScanner: false, module: "B" },
  { number: 18, size: "big", isScanner: false, module: "B" },
];

export const TOTAL_COMPARTMENTS = COMPARTMENTS.length;

/** Currently unused — no dedicated scanner bay in the 18-slot layout. */
export const SCANNER_COMPARTMENT =
  COMPARTMENTS.find((c) => c.isScanner)?.number ?? null;

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

/** Compartment numbers that can hold a medication. */
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
