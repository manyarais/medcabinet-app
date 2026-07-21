import { describe, expect, it } from "vitest";
import {
  filterExtractedSymptoms,
  looksLikeNaturalLanguage,
} from "@/lib/symptomParse";

describe("symptomParse helpers", () => {
  it("treats single words as direct match (no NL parse)", () => {
    expect(looksLikeNaturalLanguage("headache")).toBe(false);
    expect(looksLikeNaturalLanguage("  insomnia  ")).toBe(false);
  });

  it("treats multi-word text as natural language", () => {
    expect(looksLikeNaturalLanguage("my head is pounding")).toBe(true);
    expect(looksLikeNaturalLanguage("stuffed up and can't sleep")).toBe(true);
  });

  it("drops medication names and advice fragments from extracts", () => {
    expect(
      filterExtractedSymptoms([
        "headache",
        "Advil",
        "what should I take",
        "nasal congestion",
        "ibuprofen",
      ]),
    ).toEqual(["headache", "nasal congestion"]);
  });
});
