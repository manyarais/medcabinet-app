import { describe, expect, it } from "vitest";
import { excerptAroundMatch, findMatchExcerpt } from "@/lib/symptoms";

describe("excerptAroundMatch / findMatchExcerpt (T1.2)", () => {
  it("matches case-insensitively", () => {
    expect(excerptAroundMatch("Pain due to Headache today", "headache")).toContain("Headache");
  });

  it("prefers purpose over indications", () => {
    const excerpt = findMatchExcerpt(
      "Purpose mentions headache clearly",
      "Indications also say headache",
      "headache",
    );
    expect(excerpt).toContain("Purpose mentions");
  });

  it("falls back to indications when purpose has no match", () => {
    const excerpt = findMatchExcerpt("Fever reducer", "Also for headache relief", "headache");
    expect(excerpt).toContain("headache");
  });

  it("returns null when there is no match", () => {
    expect(findMatchExcerpt("Fever only", "No match here", "headache")).toBeNull();
  });

  it("adds ellipsis when the hit is mid-string", () => {
    const long =
      `${"A".repeat(50)} headache ${"B".repeat(50)}`;
    const excerpt = excerptAroundMatch(long, "headache");
    expect(excerpt?.startsWith("…")).toBe(true);
    expect(excerpt?.endsWith("…")).toBe(true);
  });

  it("returns null for empty/whitespace symptom or text without throwing", () => {
    expect(excerptAroundMatch("headache", "  ")).toBeNull();
    expect(excerptAroundMatch("", "headache")).toBeNull();
    expect(findMatchExcerpt(null, "   ", "headache")).toBeNull();
  });
});
