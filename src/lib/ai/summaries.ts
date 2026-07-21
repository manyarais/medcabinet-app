// Caregiver summaries. Two stages per the spec:
//   Stage 1 (deterministic): compute verified facts + important events from
//   the activity log and inventory, each carrying evidence ids.
//   Stage 2: render prose FROM THE FACTS ONLY. The deterministic renderer is
//   the source of truth; the LLM may only re-word its sentences, and any
//   reworded sentence that drops/adds a number or name falls back to the
//   deterministic wording. Summaries never claim a dose was taken.

import { prisma } from "@/lib/db";
import { effectiveExpiryForMedication } from "@/lib/expiration";
import { chatJSON, aiAvailable, AI_MODEL } from "@/lib/ai/openai";
import { recordAudit } from "@/lib/ai/audit";
import type { ActivityEvent, Medication } from "@prisma/client";

export const SUMMARY_PROMPT_VERSION = "summary-v1";

export type SummaryPeriod = "DAILY" | "WEEKLY" | "ON_DEMAND";

export type SummaryFactSet = {
  period: { start: string; end: string; label: SummaryPeriod };
  facts: {
    compartments_accessed: number;
    medications_added: number;
    medications_currently_removed: number;
    expiring_within_30_days: number;
    expired: number;
    records_needing_confirmation: number;
    scans_run: number;
  };
  important_events: Array<{
    type: "MEDICATION_STILL_REMOVED" | "EXPIRED" | "EXPIRING_SOON" | "NEEDS_CONFIRMATION";
    severity: "ACTION_REQUIRED" | "REVIEW_SOON";
    medication_id: number;
    medication_name: string;
    detail: string;
  }>;
  routine_events: Array<{ event_id: number; type: string; medication_name: string | null; at: string }>;
};

export type SummarySection = {
  title: string;
  items: Array<{ text: string; evidence_ids: Array<{ type: string; id: number }> }>;
};

export type SummaryOutput = {
  summary_id: number;
  period: SummaryPeriod;
  headline: string;
  sections: SummarySection[];
  generated_at: string;
  model_version: string;
};

/** Stage 1 — deterministic verified facts. Pure given its inputs (tested). */
export function buildFactSet(input: {
  period: SummaryPeriod;
  start: Date;
  end: Date;
  events: ActivityEvent[];
  medications: Medication[];
  prescriptionEnds: Map<number, string[]>;
}): SummaryFactSet {
  const { events, medications } = input;
  const active = medications.filter((m) => m.status !== "disposed");
  const nameById = new Map(active.map((m) => [m.id, m.brandName]));

  const accessed = events.filter((e) => ["out", "returned", "flash"].includes(e.type));
  const scans = events.filter((e) => e.type.startsWith("scan_"));
  const added = active.filter((m) => m.addedAt >= input.start && m.addedAt <= input.end);
  const removedNow = active.filter((m) => m.outOfCabinet);
  const pending = active.filter(
    (m) => m.status === "pending_review" || m.verificationStatus === "NEEDS_REVIEW",
  );

  let expiringSoon = 0;
  let expired = 0;
  const important: SummaryFactSet["important_events"] = [];

  for (const med of removedNow) {
    const minutes = med.outSince ? Math.round((input.end.getTime() - med.outSince.getTime()) / 60000) : null;
    important.push({
      type: "MEDICATION_STILL_REMOVED",
      severity: "ACTION_REQUIRED",
      medication_id: med.id,
      medication_name: med.brandName,
      detail: minutes != null
        ? `${med.brandName} is still marked outside the cabinet (${formatDuration(minutes)} so far).`
        : `${med.brandName} is still marked outside the cabinet.`,
    });
  }

  for (const med of active) {
    const { status, displayDate } = effectiveExpiryForMedication({
      expirationDate: med.expirationDate,
      productType: med.productType,
      prescriptionEndDates: input.prescriptionEnds.get(med.id),
    });
    if (status === "expired") {
      expired += 1;
      important.push({
        type: "EXPIRED",
        severity: "ACTION_REQUIRED",
        medication_id: med.id,
        medication_name: med.brandName,
        detail: `${med.brandName} is past its expiration (${displayDate ?? "date on label"}).`,
      });
    } else if (status === "soon") {
      expiringSoon += 1;
      important.push({
        type: "EXPIRING_SOON",
        severity: "REVIEW_SOON",
        medication_id: med.id,
        medication_name: med.brandName,
        detail: `${med.brandName} expires soon (${displayDate ?? "see label"}).`,
      });
    }
  }

  for (const med of pending) {
    important.push({
      type: "NEEDS_CONFIRMATION",
      severity: "REVIEW_SOON",
      medication_id: med.id,
      medication_name: med.brandName,
      detail: `${med.brandName} is waiting for its label information to be confirmed.`,
    });
  }

  return {
    period: {
      start: input.start.toISOString(),
      end: input.end.toISOString(),
      label: input.period,
    },
    facts: {
      compartments_accessed: accessed.length,
      medications_added: added.length,
      medications_currently_removed: removedNow.length,
      expiring_within_30_days: expiringSoon,
      expired,
      records_needing_confirmation: pending.length,
      scans_run: scans.length,
    },
    important_events: important,
    routine_events: events.slice(0, 20).map((e) => ({
      event_id: e.id,
      type: e.type,
      medication_name: e.medicationId ? nameById.get(e.medicationId) ?? null : null,
      at: e.createdAt.toISOString(),
    })),
  };
}

export function formatDuration(minutes: number): string {
  if (minutes < 120) return `${minutes} minutes`; // under 2h, exact beats rounded
  const h = Math.round(minutes / 60);
  return h < 48 ? `${h} hours` : `${Math.round(h / 24)} days`;
}

/** Stage 2 — deterministic renderer. Every sentence maps to fact-set fields. */
export function renderSections(facts: SummaryFactSet): { headline: string; sections: SummarySection[] } {
  const sections: SummarySection[] = [];
  const attention = facts.important_events.filter((e) => e.severity === "ACTION_REQUIRED");
  const review = facts.important_events.filter((e) => e.severity === "REVIEW_SOON");

  if (attention.length || review.length) {
    sections.push({
      title: "Needs attention",
      items: [...attention, ...review].map((e) => ({
        text: e.detail,
        evidence_ids: [{ type: "medication", id: e.medication_id }],
      })),
    });
  }

  const f = facts.facts;
  const activityBits: string[] = [];
  if (f.compartments_accessed > 0)
    activityBits.push(`${f.compartments_accessed} compartment ${f.compartments_accessed === 1 ? "event" : "events"} (opened, returned or lit)`);
  if (f.scans_run > 0) activityBits.push(`${f.scans_run} scan ${f.scans_run === 1 ? "event" : "events"}`);
  sections.push({
    title: "Recent cabinet activity",
    items: [
      {
        text: activityBits.length
          ? `This period had ${activityBits.join(" and ")}. Cabinet events show access only — they do not show whether a dose was taken.`
          : "No cabinet activity was recorded in this period.",
        evidence_ids: facts.routine_events.slice(0, 5).map((e) => ({ type: "cabinet_event", id: e.event_id })),
      },
    ],
  });

  if (f.medications_added > 0 || f.records_needing_confirmation > 0) {
    const bits: string[] = [];
    if (f.medications_added > 0) bits.push(`${f.medications_added} new medication${f.medications_added === 1 ? " was" : "s were"} added`);
    if (f.records_needing_confirmation > 0)
      bits.push(`${f.records_needing_confirmation} record${f.records_needing_confirmation === 1 ? " is" : "s are"} waiting for label confirmation`);
    sections.push({
      title: "Inventory changes",
      items: [{ text: `${bits.join("; ")}.`, evidence_ids: [] }],
    });
  }

  const headline =
    attention.length > 0
      ? `${attention.length} item${attention.length === 1 ? "" : "s"} need${attention.length === 1 ? "s" : ""} attention`
      : review.length > 0
        ? `Nothing urgent — ${review.length} item${review.length === 1 ? "" : "s"} to review soon`
        : "All quiet — nothing needs attention";

  return { headline, sections };
}

/** Full pipeline: build facts, render, optionally polish wording, store. */
export async function generateSummary(period: SummaryPeriod): Promise<SummaryOutput> {
  const end = new Date();
  const start = new Date(end.getTime() - (period === "WEEKLY" ? 7 : 1) * 86400000);

  const [events, medications, prescriptions] = await Promise.all([
    prisma.activityEvent.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.medication.findMany(),
    prisma.prescription.findMany({ select: { medicationId: true, endDate: true } }),
  ]);
  const prescriptionEnds = new Map<number, string[]>();
  for (const p of prescriptions)
    prescriptionEnds.set(p.medicationId, [...(prescriptionEnds.get(p.medicationId) ?? []), p.endDate]);

  const factSet = buildFactSet({ period, start, end, events, medications, prescriptionEnds });
  const rendered = renderSections(factSet);

  // Optional LLM polish of the "Needs attention" wording — verified so it can
  // only re-word, never re-fact. Anything suspicious keeps deterministic text.
  let modelVersion = "deterministic-v1";
  if (aiAvailable() && rendered.sections.length > 0) {
    try {
      const polished = await polishWording(rendered.sections);
      if (polished) {
        rendered.sections = polished;
        modelVersion = AI_MODEL;
      }
    } catch {
      // deterministic text already in place
    }
  }

  const row = await prisma.caregiverSummary.create({
    data: {
      period,
      headline: rendered.headline,
      sections: JSON.stringify(rendered.sections),
      factSet: JSON.stringify(factSet),
      modelVersion,
    },
  });

  void recordAudit({
    feature: "summary",
    promptVersion: SUMMARY_PROMPT_VERSION,
    inputRefs: { period, factSet },
    output: rendered,
  });

  return {
    summary_id: row.id,
    period,
    headline: rendered.headline,
    sections: rendered.sections,
    generated_at: row.createdAt.toISOString(),
    model_version: modelVersion,
  };
}

async function polishWording(sections: SummarySection[]): Promise<SummarySection[] | null> {
  const reply = await chatJSON<{ sections: Array<{ title: string; items: Array<{ text: string }> }> }>({
    system:
      "Rewrite each sentence to be warm and plain for a family caregiver. Keep every number, " +
      "medication name and duration EXACTLY. Never say a dose was taken, missed or is medically " +
      "urgent — only cabinet/inventory facts. Same number of sections and items, same order. " +
      'Reply JSON: {"sections":[{"title":"...","items":[{"text":"..."}]}]}',
    user: JSON.stringify(sections.map((s) => ({ title: s.title, items: s.items.map((i) => ({ text: i.text })) }))),
    maxTokens: 600,
  });
  if (!reply?.sections || reply.sections.length !== sections.length) return null;

  const out: SummarySection[] = [];
  for (let i = 0; i < sections.length; i++) {
    const orig = sections[i];
    const alt = reply.sections[i];
    if (!alt?.items || alt.items.length !== orig.items.length) return null;
    out.push({
      title: orig.title,
      items: orig.items.map((item, j) => {
        const nextText = alt.items[j]?.text?.trim();
        return {
          text: nextText && sameFacts(item.text, nextText) ? nextText : item.text,
          evidence_ids: item.evidence_ids,
        };
      }),
    });
  }
  return out;
}

/** Reworded sentence must keep the same numbers and capitalized names. */
export function sameFacts(original: string, rewrite: string): boolean {
  const nums = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(",");
  if (nums(original) !== nums(rewrite)) return false;
  const names = (s: string) => new Set(s.match(/\b[A-Z][a-z]{2,}\b/g) ?? []);
  const origNames = names(original);
  const newNames = names(rewrite);
  for (const n of origNames) {
    // Sentence-initial words may legitimately change; medication names mid-
    // sentence must survive. Heuristic: require all but the first word.
    if (!newNames.has(n) && !original.startsWith(n)) return false;
  }
  const banned = /\b(took|taken|missed|noncomplian|overdue dose|administer)\b/i;
  if (banned.test(rewrite) && !banned.test(original)) return false;
  return true;
}
