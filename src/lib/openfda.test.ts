import { describe, expect, it } from "vitest";
import { firstString, joinField, mapProductType } from "@/lib/openfda";

describe("openFDA field helpers (T1.4)", () => {
  it("maps product_type strings", () => {
    expect(mapProductType("HUMAN OTC DRUG")).toBe("OTC");
    expect(mapProductType("HUMAN PRESCRIPTION DRUG")).toBe("PRESCRIPTION");
    expect(mapProductType("something else")).toBe("UNKNOWN");
    expect(mapProductType(null)).toBe("UNKNOWN");
  });

  it("joins array fields and tolerates missing data", () => {
    expect(joinField(["a", "b"])).toBe("a\n\nb");
    expect(joinField(undefined)).toBeNull();
    expect(joinField([])).toBeNull();
    expect(firstString(["Tylenol"])).toBe("Tylenol");
    expect(firstString(undefined)).toBeNull();
    expect(firstString([])).toBeNull();
  });
});
