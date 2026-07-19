import { describe, expect, it } from "vitest";
import { validateAssignableCompartment } from "@/lib/cabinet";
import {
  isScannerCompartment,
  isValidAssignableCompartment,
  sizeForCompartment,
  TOTAL_COMPARTMENTS,
} from "@/lib/compartments";

describe("compartment validation (T1.3)", () => {
  it("rejects non-integers and out-of-range slots", () => {
    expect(validateAssignableCompartment(2.5, new Map()).ok).toBe(false);
    expect(validateAssignableCompartment(0, new Map()).ok).toBe(false);
    expect(validateAssignableCompartment(TOTAL_COMPARTMENTS + 1, new Map()).ok).toBe(false);
    expect(isValidAssignableCompartment(0)).toBe(false);
    expect(isValidAssignableCompartment(TOTAL_COMPARTMENTS + 1)).toBe(false);
  });

  it("rejects occupied slots and names the occupant", () => {
    const occupied = new Map([[3, { id: 9, brandName: "Tylenol" }]]);
    const result = validateAssignableCompartment(3, occupied);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.error).toContain("Tylenol");
    }
  });

  it("accepts a free valid slot and returns its size", () => {
    const result = validateAssignableCompartment(1, new Map());
    expect(result).toEqual({ ok: true, compartmentSize: "medium" });
    expect(sizeForCompartment(1)).toBe("medium");
    expect(sizeForCompartment(8)).toBe("medium");
  });

  it("treats current layout as having no scanner bay", () => {
    for (let n = 1; n <= TOTAL_COMPARTMENTS; n++) {
      expect(isScannerCompartment(n)).toBe(false);
    }
  });
});
