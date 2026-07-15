// Physical cabinet layout constants.
// One module today (9 compartments). Change TOTAL_COMPARTMENTS to 18 when the second module is added.

/** Total compartments on the cabinet(s). Easy to bump from 9 → 18 for a second module. */
export const TOTAL_COMPARTMENTS = 9;

/** Compartment 9 is the scanner bay — never assign medications here. */
export const SCANNER_COMPARTMENT = 9;

export type CompartmentSize = "medium" | "thin" | "big";

/** Size map for one 9-bay module (repeats the same pattern for 10–18 later if needed). */
export function sizeForCompartment(compartment: number): CompartmentSize {
  const slotInModule = ((compartment - 1) % 9) + 1;

  if (slotInModule >= 1 && slotInModule <= 6) return "medium";
  if (slotInModule === 7 || slotInModule === 8) return "thin";
  return "big";
}

export function isScannerCompartment(compartment: number): boolean {
  return sizeForCompartment(compartment) === "big";
}

/** Compartment numbers that can hold a medication (excludes scanner bays). */
export function assignableCompartments(): number[] {
  const list: number[] = [];
  for (let n = 1; n <= TOTAL_COMPARTMENTS; n += 1) {
    if (!isScannerCompartment(n)) {
      list.push(n);
    }
  }
  return list;
}

export function isValidAssignableCompartment(compartment: number): boolean {
  return (
    Number.isInteger(compartment) &&
    compartment >= 1 &&
    compartment <= TOTAL_COMPARTMENTS &&
    !isScannerCompartment(compartment)
  );
}
