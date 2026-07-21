import { describe, expect, it } from "vitest";
import {
  decideNextAction,
  emptyAccumulator,
  markNotPresentAfterFullTurn,
  mergeFrame,
  missingFields,
  type EvidenceAccumulator,
  type FrameAnalysis,
} from "@/lib/ai/activeScanPolicy";

function frame(overrides: Partial<FrameAnalysis> = {}): FrameAnalysis {
  return {
    frameIndex: 0,
    angleDeg: 0,
    byteSize: 100000,
    quality: { blurry: false, glare: false, unreadable: false },
    fields: {},
    textTokens: [],
    ...overrides,
  };
}

function fullAccumulator(): EvidenceAccumulator {
  let acc = emptyAccumulator();
  acc = mergeFrame(acc, frame({
    frameIndex: 0,
    fields: {
      medication_name: { value: "Metformin", confidence: 0.95, cut_off_at_edge: false },
      strength: { value: "500 mg", confidence: 0.9, cut_off_at_edge: false },
      instructions: { value: "Take 1 tablet twice daily", confidence: 0.85, cut_off_at_edge: false },
      expiration_date: { value: "06/2027", confidence: 0.8, cut_off_at_edge: false },
      owner_name: { value: "Raj", confidence: 0.9, cut_off_at_edge: false },
    },
  }));
  return acc;
}

describe("mergeFrame", () => {
  it("raises confidence when frames agree", () => {
    let acc = emptyAccumulator();
    acc = mergeFrame(acc, frame({ frameIndex: 0, fields: { medication_name: { value: "Metformin", confidence: 0.6, cut_off_at_edge: false } } }));
    acc = mergeFrame(acc, frame({ frameIndex: 1, fields: { medication_name: { value: "metformin", confidence: 0.7, cut_off_at_edge: false } } }));
    expect(acc.medication_name.confidence).toBeGreaterThan(0.7);
    expect(acc.medication_name.supporting_frames).toEqual([0, 1]);
  });

  it("records conflicts instead of silently picking a side", () => {
    let acc = emptyAccumulator();
    acc = mergeFrame(acc, frame({ frameIndex: 0, fields: { strength: { value: "500 mg", confidence: 0.8, cut_off_at_edge: false } } }));
    acc = mergeFrame(acc, frame({ frameIndex: 1, fields: { strength: { value: "850 mg", confidence: 0.8, cut_off_at_edge: false } } }));
    expect(acc.strength.conflicting).toEqual(["850 mg"]);
  });
});

describe("decideNextAction", () => {
  it("stops with success when everything is captured", () => {
    const decision = decideNextAction({
      acc: fullAccumulator(),
      frame: frame(),
      newTokenCount: 5,
      totalRotation: 60,
      frameCount: 3,
      recapturesAtSpot: 0,
    });
    expect(decision.action).toBe("STOP_SUCCESS");
  });

  it("recaptures a glare frame before rotating", () => {
    const decision = decideNextAction({
      acc: emptyAccumulator(),
      frame: frame({ quality: { blurry: false, glare: true, unreadable: false } }),
      newTokenCount: 0,
      totalRotation: 40,
      frameCount: 2,
      recapturesAtSpot: 0,
    });
    expect(decision.action).toBe("CAPTURE_AGAIN");
  });

  it("takes a small step when a wanted field is cut off at the edge", () => {
    const decision = decideNextAction({
      acc: emptyAccumulator(),
      frame: frame({ fields: { instructions: { value: "Take 1", confidence: 0.4, cut_off_at_edge: true } } }),
      newTokenCount: 6,
      totalRotation: 40,
      frameCount: 2,
      recapturesAtSpot: 0,
    });
    expect(decision.action).toBe("ROTATE_CLOCKWISE_10");
  });

  it("strides further when a frame adds nothing new", () => {
    const decision = decideNextAction({
      acc: emptyAccumulator(),
      frame: frame(),
      newTokenCount: 0,
      totalRotation: 80,
      frameCount: 4,
      recapturesAtSpot: 0,
    });
    expect(decision.action).toBe("ROTATE_CLOCKWISE_30");
  });

  it("stops for review at the rotation cap", () => {
    const decision = decideNextAction({
      acc: emptyAccumulator(),
      frame: frame(),
      newTokenCount: 4,
      totalRotation: 430,
      frameCount: 9,
      recapturesAtSpot: 0,
    });
    expect(decision.action).toBe("STOP_REVIEW_REQUIRED");
  });
});

describe("markNotPresentAfterFullTurn", () => {
  it("marks soft fields NOT_PRESENT after 360° so scans can finish", () => {
    let acc = emptyAccumulator();
    acc = mergeFrame(acc, frame({
      fields: {
        medication_name: { value: "Tylenol", confidence: 0.9, cut_off_at_edge: false },
        strength: { value: "500 mg", confidence: 0.9, cut_off_at_edge: false },
      },
    }));
    const after = markNotPresentAfterFullTurn(acc, 380);
    expect(after.owner_name.not_present).toBe(true);
    expect(missingFields(after)).toEqual([]);
  });

  it("never marks anything before a full turn", () => {
    const after = markNotPresentAfterFullTurn(emptyAccumulator(), 200);
    expect(after.owner_name.not_present).toBe(false);
  });
});
