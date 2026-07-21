import { describe, expect, it } from "vitest";
import { buildFactSet, renderSections, sameFacts } from "@/lib/ai/summaries";
import type { ActivityEvent, Medication } from "@prisma/client";

const now = new Date("2026-07-21T12:00:00");
const start = new Date("2026-07-20T12:00:00");

function med(overrides: Partial<Medication>): Medication {
  return {
    id: 1,
    brandName: "Metformin",
    genericName: null,
    productType: "PRESCRIPTION",
    indications: "",
    purpose: null,
    warnings: null,
    dosage: null,
    expirationDate: null,
    compartment: 1,
    compartmentSize: null,
    outOfCabinet: false,
    status: "active",
    addedAt: new Date("2026-07-01"),
    rawLabelText: null,
    personName: "Dad",
    form: null,
    prescriber: null,
    pharmacy: null,
    rxNumber: null,
    refills: null,
    photoPaths: null,
    outSince: null,
    disposedAt: null,
    verificationStatus: "USER_CONFIRMED",
    verifiedFields: null,
    instructionsPlain: null,
    normalizedName: null,
    rxcui: null,
    normalizationStatus: null,
    normalizationConfidence: null,
    normalizationJson: null,
    ...overrides,
  } as Medication;
}

function event(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: 1,
    type: "out",
    medicationId: 1,
    compartment: 1,
    detail: null,
    createdAt: new Date("2026-07-21T08:00:00"),
    ...overrides,
  } as ActivityEvent;
}

describe("buildFactSet", () => {
  it("flags a bottle still outside the cabinet as ACTION_REQUIRED", () => {
    const facts = buildFactSet({
      period: "DAILY",
      start,
      end: now,
      events: [event({})],
      medications: [med({ outOfCabinet: true, outSince: new Date("2026-07-21T10:25:00") })],
      prescriptionEnds: new Map(),
    });
    expect(facts.facts.medications_currently_removed).toBe(1);
    const removed = facts.important_events.find((e) => e.type === "MEDICATION_STILL_REMOVED");
    expect(removed?.severity).toBe("ACTION_REQUIRED");
    expect(removed?.detail).toContain("95 minutes");
  });

  it("counts records needing confirmation", () => {
    const facts = buildFactSet({
      period: "DAILY",
      start,
      end: now,
      events: [],
      medications: [med({ status: "pending_review", verificationStatus: "AI_EXTRACTED" })],
      prescriptionEnds: new Map(),
    });
    expect(facts.facts.records_needing_confirmation).toBe(1);
  });
});

describe("renderSections", () => {
  it("produces a calm factual message for a no-activity period", () => {
    const facts = buildFactSet({
      period: "DAILY",
      start,
      end: now,
      events: [],
      medications: [med({})],
      prescriptionEnds: new Map(),
    });
    const { headline, sections } = renderSections(facts);
    expect(headline).toContain("All quiet");
    const activity = sections.find((s) => s.title === "Recent cabinet activity");
    expect(activity?.items[0].text).toContain("No cabinet activity");
  });

  it("every attention item carries evidence ids", () => {
    const facts = buildFactSet({
      period: "DAILY",
      start,
      end: now,
      events: [],
      medications: [med({ outOfCabinet: true, outSince: new Date("2026-07-21T09:00:00") })],
      prescriptionEnds: new Map(),
    });
    const { sections } = renderSections(facts);
    const attention = sections.find((s) => s.title === "Needs attention");
    expect(attention).toBeDefined();
    for (const item of attention!.items) {
      expect(item.evidence_ids.length).toBeGreaterThan(0);
    }
  });
});

describe("sameFacts", () => {
  it("accepts a faithful rewording", () => {
    expect(
      sameFacts(
        "Metformin is still marked outside the cabinet (95 minutes so far).",
        "The Metformin bottle has now been outside the cabinet for 95 minutes.",
      ),
    ).toBe(true);
  });

  it("rejects a rewrite that changes a number", () => {
    expect(
      sameFacts("2 medications expire within 30 days.", "3 medications expire within 30 days."),
    ).toBe(false);
  });

  it("rejects a rewrite that claims a dose was taken", () => {
    expect(
      sameFacts(
        "The Metformin compartment was accessed at 8 PM.",
        "Dad took his Metformin at 8 PM.",
      ),
    ).toBe(false);
  });
});
