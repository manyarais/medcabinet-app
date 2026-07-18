// Physical cabinet layout — single source of truth.
// The cabinet is one 8-bay unit driven by the CabinetLights ESP32:
// compartment N is light/switch unit N-1 on the board (1-based here,
// 0-based in the firmware). Edit COMPARTMENTS when the hardware changes.

export type CompartmentSize = "medium" | "thin" | "big";

export type CompartmentConfig = {
  number: number;
  size: CompartmentSize;
  /** Reserved for a future non-assignable scanner bay (none currently). */
  isScanner: boolean;
};

/** 8 identical bays, numbered 1–8 to match the light strips. */
export const COMPARTMENTS: CompartmentConfig[] = Array.from(
  { length: 8 },
  (_, i) => ({ number: i + 1, size: "medium" as const, isScanner: false }),
);

export const TOTAL_COMPARTMENTS = COMPARTMENTS.length;

/** Currently unused — no dedicated scanner bay in the 8-slot layout. */
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
