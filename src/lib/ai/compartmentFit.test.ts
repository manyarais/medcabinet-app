import { describe, expect, it } from "vitest";
import { checkFit, recommendCompartment } from "@/lib/ai/compartmentFit";

describe("checkFit", () => {
  it("rejects a bottle exactly as wide as the door (margins!)", () => {
    // medium door opening is 74 mm; 74 mm bottle must NOT fit.
    const fit = checkFit("medium", { width: 74, depth: 74, height: 90 });
    expect(fit.fits).toBe(false);
  });

  it("accepts a standard bottle in a medium bay with clearance", () => {
    const fit = checkFit("medium", { width: 48, depth: 48, height: 95 });
    expect(fit.fits).toBe(true);
  });

  it("uncertainty counts against the fit", () => {
    const tight = checkFit("medium", { width: 60, depth: 60, height: 95 }, { width: 10, depth: 10, height: 5 });
    expect(tight.fits).toBe(false);
  });

  it("flags snug fits for confirmation", () => {
    const fit = checkFit("medium", { width: 62, depth: 62, height: 108 });
    expect(fit.fits).toBe(true);
    expect(fit.snug).toBe(true);
  });
});

describe("recommendCompartment", () => {
  const dims = { width: 48, depth: 48, height: 95 };

  it("never assigns an occupied bay", () => {
    const result = recommendCompartment({ dims, occupied: new Set([1, 2, 3]) });
    expect(result.recommended_compartment).toBe(4);
    expect(result.alternatives).not.toContain(1);
  });

  it("returns null with confirmation required when nothing fits", () => {
    const result = recommendCompartment({
      dims: { width: 300, depth: 300, height: 300 },
      occupied: new Set(),
    });
    expect(result.recommended_compartment).toBeNull();
    expect(result.requires_user_confirmation).toBe(true);
  });

  it("prefers the lowest-numbered (easiest to reach) fitting bay", () => {
    const result = recommendCompartment({ dims, occupied: new Set() });
    expect(result.recommended_compartment).toBe(1);
  });
});
