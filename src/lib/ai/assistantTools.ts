// Deterministic backend tools for the caregiver assistant. The language
// model NEVER answers from its own knowledge — it can only call these, and
// every result carries evidence references back to real rows. Pillio is a
// single-household app with no accounts, so the permission filter is a
// pass-through hook kept in one place for when accounts arrive.

import { prisma } from "@/lib/db";
import { effectiveExpiryForMedication, parseExpiration } from "@/lib/expiration";
import type { Medication } from "@prisma/client";
import type { ToolSchema } from "@/lib/ai/openai";

export type Evidence = { type: "medication" | "cabinet_event"; id: number };

export type ToolResult = {
  data: unknown;
  evidence: Evidence[];
};

// What the model is allowed to see about a medication. Original label text is
// included so "explain the label" stays grounded in the confirmed source.
function medView(med: Medication) {
  return {
    medication_id: med.id,
    display_name: med.brandName,
    generic_name: med.genericName,
    strength: med.dosage,
    form: med.form,
    owner_name: med.personName ?? "Household (shared)",
    compartment: med.compartment,
    physical_status: med.outOfCabinet ? "REMOVED" : med.compartment ? "STORED" : "UNASSIGNED",
    verification_status: med.verificationStatus,
    expiration_date: med.expirationDate,
    labelled_uses: med.indications || med.purpose || null,
    instructions_original: med.dosage ?? null,
    warnings: med.warnings,
    pharmacy: med.pharmacy,
    prescriber: med.prescriber,
    added_at: med.addedAt,
    status: med.status,
  };
}

function medsEvidence(meds: Medication[]): Evidence[] {
  return meds.map((m) => ({ type: "medication" as const, id: m.id }));
}

/** Future accounts hook: filter rows the requesting user may not see. */
function permitted(meds: Medication[]): Medication[] {
  return meds;
}

async function activeMeds(): Promise<Medication[]> {
  return permitted(await prisma.medication.findMany({ where: { status: { not: "disposed" } } }));
}

// ---- the tools ----

async function searchMedications(args: { query: string }): Promise<ToolResult> {
  const q = (args.query ?? "").trim().toLowerCase();
  const meds = await activeMeds();
  const hits = q
    ? meds.filter((m) =>
        [m.brandName, m.genericName, m.personName, m.rawLabelText, m.normalizedName]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(q)),
      )
    : [];
  return { data: hits.map(medView), evidence: medsEvidence(hits) };
}

async function getMedicationDetails(args: { medication_id: number }): Promise<ToolResult> {
  const med = await prisma.medication.findUnique({ where: { id: Number(args.medication_id) } });
  if (!med || med.status === "disposed") return { data: null, evidence: [] };
  return { data: medView(med), evidence: medsEvidence([med]) };
}

async function getMedicationsByOwner(args: { owner_name: string }): Promise<ToolResult> {
  const q = (args.owner_name ?? "").trim().toLowerCase();
  const meds = (await activeMeds()).filter((m) =>
    q === "household"
      ? m.personName == null
      : (m.personName ?? "").toLowerCase().includes(q),
  );
  return { data: meds.map(medView), evidence: medsEvidence(meds) };
}

async function getStoredMedications(): Promise<ToolResult> {
  const meds = (await activeMeds()).filter((m) => !m.outOfCabinet && m.compartment != null);
  return { data: meds.map(medView), evidence: medsEvidence(meds) };
}

async function getRemovedMedications(): Promise<ToolResult> {
  const meds = (await activeMeds()).filter((m) => m.outOfCabinet);
  return {
    data: meds.map((m) => ({ ...medView(m), out_since: m.outSince })),
    evidence: medsEvidence(meds),
  };
}

async function getExpiringMedications(args: { within_days?: number }): Promise<ToolResult> {
  const days = Math.min(Math.max(Number(args.within_days ?? 30), 1), 365);
  const meds = await activeMeds();
  const rx = await prisma.prescription.findMany({ select: { medicationId: true, endDate: true } });
  const endsByMed = new Map<number, string[]>();
  for (const p of rx) endsByMed.set(p.medicationId, [...(endsByMed.get(p.medicationId) ?? []), p.endDate]);

  const cutoff = Date.now() + days * 86400000;
  const hits = meds.filter((m) => {
    const { status, displayDate } = effectiveExpiryForMedication({
      expirationDate: m.expirationDate,
      productType: m.productType,
      prescriptionEndDates: endsByMed.get(m.id),
    });
    if (status === "expired") return true;
    if (!displayDate) return false;
    const when = parseExpiration(displayDate);
    return when != null && when.getTime() <= cutoff;
  });
  return {
    data: hits.map((m) => ({ ...medView(m), within_days: days })),
    evidence: medsEvidence(hits),
  };
}

async function getRecentCabinetEvents(args: { limit?: number }): Promise<ToolResult> {
  const limit = Math.min(Math.max(Number(args.limit ?? 10), 1), 50);
  const events = await prisma.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const medIds = [...new Set(events.map((e) => e.medicationId).filter((x): x is number => x != null))];
  const meds = await prisma.medication.findMany({ where: { id: { in: medIds } } });
  const nameById = new Map(meds.map((m) => [m.id, m.brandName]));
  return {
    data: events.map((e) => ({
      event_id: e.id,
      type: e.type,
      medication_id: e.medicationId,
      medication_name: e.medicationId ? nameById.get(e.medicationId) ?? null : null,
      compartment: e.compartment,
      detail: e.detail,
      at: e.createdAt,
      // The assistant must never claim ingestion from a cabinet event.
      note: "cabinet/app event only — does not show whether a dose was taken",
    })),
    evidence: [
      ...events.map((e) => ({ type: "cabinet_event" as const, id: e.id })),
      ...medsEvidence(meds),
    ],
  };
}

async function getRecentlyAddedMedications(args: { within_days?: number }): Promise<ToolResult> {
  const days = Math.min(Math.max(Number(args.within_days ?? 7), 1), 90);
  const since = new Date(Date.now() - days * 86400000);
  const meds = (await activeMeds()).filter((m) => m.addedAt >= since);
  return { data: meds.map(medView), evidence: medsEvidence(meds) };
}

async function getUnverifiedMedications(): Promise<ToolResult> {
  const meds = (await activeMeds()).filter(
    (m) => m.verificationStatus !== "USER_CONFIRMED" || m.status === "pending_review",
  );
  return { data: meds.map(medView), evidence: medsEvidence(meds) };
}

async function searchLabelledUses(args: { use: string }): Promise<ToolResult> {
  const q = (args.use ?? "").trim().toLowerCase();
  const meds = (await activeMeds()).filter((m) =>
    q
      ? [m.indications, m.purpose, m.rawLabelText]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(q))
      : false,
  );
  return { data: meds.map(medView), evidence: medsEvidence(meds) };
}

async function getHouseholdStatus(): Promise<ToolResult> {
  const meds = await activeMeds();
  const removed = meds.filter((m) => m.outOfCabinet);
  const pending = meds.filter((m) => m.status === "pending_review");
  const recent = await prisma.activityEvent.findFirst({ orderBy: { createdAt: "desc" } });
  return {
    data: {
      total_medications: meds.length,
      currently_removed: removed.map(medView),
      awaiting_review: pending.length,
      last_event: recent
        ? { event_id: recent.id, type: recent.type, at: recent.createdAt }
        : null,
    },
    evidence: [
      ...medsEvidence([...removed, ...pending]),
      ...(recent ? [{ type: "cabinet_event" as const, id: recent.id }] : []),
    ],
  };
}

// locate = details + which compartment; the actual lighting is a separate
// user-confirmed action (see /api/ai/assistant/light), never fired directly
// from model output.
async function locateMedication(args: { medication_id: number }): Promise<ToolResult> {
  return getMedicationDetails(args);
}

export const TOOL_IMPLS: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> = {
  search_medications: (a) => searchMedications(a as { query: string }),
  get_medication_details: (a) => getMedicationDetails(a as { medication_id: number }),
  get_medications_by_owner: (a) => getMedicationsByOwner(a as { owner_name: string }),
  get_stored_medications: () => getStoredMedications(),
  get_removed_medications: () => getRemovedMedications(),
  get_expiring_medications: (a) => getExpiringMedications(a as { within_days?: number }),
  get_recent_cabinet_events: (a) => getRecentCabinetEvents(a as { limit?: number }),
  get_recently_added_medications: (a) => getRecentlyAddedMedications(a as { within_days?: number }),
  get_unverified_medications: () => getUnverifiedMedications(),
  search_labelled_uses: (a) => searchLabelledUses(a as { use: string }),
  get_household_status: () => getHouseholdStatus(),
  locate_medication: (a) => locateMedication(a as { medication_id: number }),
};

const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    type: "function",
    function: {
      name: "search_medications",
      description:
        "Search household medications by name, generic name, owner or label text. Use this first for any medication the user names.",
      parameters: { type: "object", properties: { query: str("search text") }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_medication_details",
      description: "Full confirmed record for one medication id.",
      parameters: { type: "object", properties: { medication_id: num("medication id") }, required: ["medication_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_medications_by_owner",
      description: "List medications belonging to a household member (or 'household' for shared).",
      parameters: { type: "object", properties: { owner_name: str("person name") }, required: ["owner_name"] },
    },
  },
  { type: "function", function: { name: "get_stored_medications", description: "Medications currently inside the cabinet.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_removed_medications", description: "Medications currently OUT of the cabinet.", parameters: { type: "object", properties: {} } } },
  {
    type: "function",
    function: {
      name: "get_expiring_medications",
      description: "Medications expired or expiring within N days (default 30).",
      parameters: { type: "object", properties: { within_days: num("day window") } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_cabinet_events",
      description: "Recent cabinet/app activity events (scans, out/returned, flashes). Events never prove a dose was taken.",
      parameters: { type: "object", properties: { limit: num("max events, default 10") } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recently_added_medications",
      description: "Medications added within N days (default 7).",
      parameters: { type: "object", properties: { within_days: num("day window") } },
    },
  },
  { type: "function", function: { name: "get_unverified_medications", description: "Medications still needing user verification/review.", parameters: { type: "object", properties: {} } } },
  {
    type: "function",
    function: {
      name: "search_labelled_uses",
      description: "Find medications whose CONFIRMED label/uses text mentions a term (e.g. 'allergies'). Not medical advice — text search only.",
      parameters: { type: "object", properties: { use: str("term to find in labelled uses") }, required: ["use"] },
    },
  },
  { type: "function", function: { name: "get_household_status", description: "Brief household status: totals, removed bottles, items awaiting review, last event.", parameters: { type: "object", properties: {} } } },
  {
    type: "function",
    function: {
      name: "locate_medication",
      description: "Where a medication lives (compartment + stored/removed). To light the compartment, set suggested_action instead of answering that it is lit.",
      parameters: { type: "object", properties: { medication_id: num("medication id") }, required: ["medication_id"] },
    },
  },
];
