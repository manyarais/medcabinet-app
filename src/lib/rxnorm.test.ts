import { describe, expect, it } from "vitest";
import { vowelInsertionVariants } from "@/lib/rxnorm";

describe("rxnorm vowelInsertionVariants", () => {
  it("includes Advil for Advl (missing vowel)", () => {
    const variants = vowelInsertionVariants("Advl");
    expect(variants).toContain("advil");
  });
});
