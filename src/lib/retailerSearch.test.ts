import { describe, expect, it } from "vitest";
import {
  buildReorderQuery,
  instacartWebSearchUrl,
  retailerSearchUrl,
} from "@/lib/retailerSearch";

describe("retailerSearch", () => {
  it("builds query from brand and dosage", () => {
    expect(buildReorderQuery("Tylenol", "500 mg")).toBe("Tylenol 500 mg");
  });

  it("omits empty dosage", () => {
    expect(buildReorderQuery("Advil", null)).toBe("Advil");
    expect(buildReorderQuery("Advil", "  ")).toBe("Advil");
  });

  it("encodes Amazon / Walmart / Target search URLs", () => {
    const q = buildReorderQuery("Tylenol Extra Strength", "500 mg");
    expect(retailerSearchUrl("amazon", q)).toBe(
      "https://www.amazon.com/s?k=Tylenol%20Extra%20Strength%20500%20mg",
    );
    expect(retailerSearchUrl("walmart", q)).toBe(
      "https://www.walmart.com/search?q=Tylenol%20Extra%20Strength%20500%20mg",
    );
    expect(retailerSearchUrl("target", q)).toBe(
      "https://www.target.com/s?searchTerm=Tylenol%20Extra%20Strength%20500%20mg",
    );
  });

  it("encodes Instacart web search URL", () => {
    expect(instacartWebSearchUrl("Tylenol 500 mg")).toBe(
      "https://www.instacart.com/store/s?k=Tylenol%20500%20mg",
    );
  });
});
