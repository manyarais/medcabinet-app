import { describe, expect, it } from "vitest";
import {
  classifyPair,
  extractForm,
  extractStrengths,
  normalizeLabelText,
  scoreCandidate,
  strengthsConflict,
} from "@/lib/ai/normalizeMed";

describe("normalizeLabelText", () => {
  it("expands abbreviations and normalizes units", () => {
    expect(normalizeLabelText("METFORMIN HCL 500MG TAB")).toBe(
      "metformin hydrochloride 500 mg tablet",
    );
  });

  it("expands APAP to acetaminophen", () => {
    expect(normalizeLabelText("APAP 500 MG TAB")).toContain("acetaminophen");
  });
});

describe("extractStrengths / extractForm", () => {
  it("finds strengths with decimals preserved", () => {
    expect(extractStrengths("Levothyroxine 0.05 mg tablet")).toEqual(["0.05 mg"]);
  });

  it("detects extended-release forms", () => {
    expect(extractForm("Metformin ER 500 mg")).toBe("extended-release");
    expect(extractForm("metformin 500 mg tablets")).toBe("tablet");
  });
});

describe("scoreCandidate", () => {
  it("penalizes strength conflicts below name-only matches", () => {
    const conflicting = scoreCandidate({
      nameScore: 1,
      labelStrengths: ["10 mg"],
      candidateStrengths: ["20 mg"],
      labelForm: "tablet",
      candidateForm: "tablet",
    });
    const agreeing = scoreCandidate({
      nameScore: 0.7,
      labelStrengths: ["10 mg"],
      candidateStrengths: ["10 mg"],
      labelForm: "tablet",
      candidateForm: "tablet",
    });
    expect(agreeing).toBeGreaterThan(conflicting);
    expect(conflicting).toBeLessThan(0.35); // lands in NO_MATCH territory
  });
});

const baseMed = {
  id: 1,
  brandName: "Lisinopril",
  genericName: "lisinopril",
  normalizedName: null,
  dosage: "10 mg",
  form: "tablet",
  personName: "Dad",
  rxNumber: "111",
};

describe("classifyPair", () => {
  it("flags same ingredient at different strengths, requiring review", () => {
    const finding = classifyPair(baseMed, {
      ...baseMed,
      id: 2,
      dosage: "20 mg",
      rxNumber: "222",
    });
    expect(finding?.duplicate_type).toBe("SAME_INGREDIENT_DIFFERENT_STRENGTH");
    expect(finding?.requires_review).toBe(true);
  });

  it("flags brand vs generic with the same ingredient", () => {
    const finding = classifyPair(
      { ...baseMed, brandName: "Tylenol", genericName: "acetaminophen", dosage: "500 mg" },
      { ...baseMed, id: 2, brandName: "Acetaminophen", genericName: "acetaminophen", dosage: "500 mg" },
    );
    expect(finding?.duplicate_type).toBe("SAME_INGREDIENT_DIFFERENT_BRAND");
  });

  it("flags a likely refill on differing Rx numbers", () => {
    const finding = classifyPair(baseMed, { ...baseMed, id: 2, rxNumber: "999" });
    expect(finding?.duplicate_type).toBe("POSSIBLE_REFILL");
  });

  it("flags near-identical names as possible OCR duplicates", () => {
    const finding = classifyPair(
      { ...baseMed, brandName: "Metformin", genericName: null },
      { ...baseMed, id: 2, brandName: "Metforrnin", genericName: null },
    );
    expect(finding?.duplicate_type).toBe("POSSIBLE_OCR_DUPLICATE");
  });

  it("returns null for unrelated medications", () => {
    const finding = classifyPair(baseMed, {
      ...baseMed,
      id: 2,
      brandName: "Atorvastatin",
      genericName: "atorvastatin",
      dosage: "40 mg",
    });
    expect(finding).toBeNull();
  });
});

describe("strengthsConflict", () => {
  it("is not a conflict when one side is unknown", () => {
    expect(strengthsConflict(["10 mg"], [])).toBe(false);
  });
  it("conflicts when both known and disjoint", () => {
    expect(strengthsConflict(["10 mg"], ["20 mg"])).toBe(true);
  });
});
