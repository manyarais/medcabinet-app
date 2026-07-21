// Grounded caregiver assistant. Tool-calling loop: the model classifies the
// question, calls deterministic tools, and must answer ONLY from tool results.
// The reply is a structured JSON object validated here before anything is
// shown or executed — invalid evidence ids or unknown medication ids fail
// closed to a safe fallback message.

import { chat, type ToolCall } from "@/lib/ai/openai";
import { TOOL_IMPLS, TOOL_SCHEMAS, type Evidence } from "@/lib/ai/assistantTools";
import { recordAudit } from "@/lib/ai/audit";

export const ASSISTANT_PROMPT_VERSION = "assistant-v1";

const SYSTEM_PROMPT = `You are Pillio's household medication assistant. Pillio is an inventory, organization and caregiver-information system — NOT a medical advisor.

STRICT RULES:
1. Answer ONLY from tool results in this conversation. Never use general medical knowledge. If no tool result contains the fact, say you could not find it in the confirmed Pillio inventory.
2. REFUSE (safety_status "REFUSED_MEDICAL") any question asking what someone should take, whether a dose or combination is safe, whether to stop/start a medication, or which medication is best for a symptom. Reply for those: "I cannot determine what someone should take or whether medications are safe together. I can show the confirmed label information and locate the medications in Pillio."
3. A cabinet event (door opened, bottle out) NEVER means a dose was taken. Say "the compartment was accessed", never "the medication was taken".
4. When several medications plausibly match, do not guess — list the matches and ask the user to pick one (safety_status "NEEDS_CLARIFICATION").
5. When label info is AI-extracted but not user-confirmed, say so.
6. To light a compartment, set suggested_action; the app asks the user to confirm. Never claim a light is already on.
7. Explaining label instructions means restating the CONFIRMED label text plainly — never add, infer or soften anything.

After your tool calls, reply with ONLY this JSON object (no markdown):
{
  "intent": "LOCATE_MEDICATION | LIST_BY_OWNER | LIST_STORED | LIST_REMOVED | LIST_EXPIRING | EXPLAIN_LABEL | RECENT_ACTIVITY | RECENTLY_ADDED | NEEDS_VERIFICATION | SEARCH_USES | LIGHT_COMPARTMENT | HOUSEHOLD_STATUS | OTHER",
  "answer": "concise answer for an older adult — plain, warm, no jargon",
  "evidence_ids": [{"type": "medication" | "cabinet_event", "id": 123}],
  "medication_ids": [123],
  "suggested_action": null | {"type": "LIGHT_COMPARTMENT", "medication_id": 123, "compartment": 4},
  "safety_status": "ALLOWED | REFUSED_MEDICAL | NEEDS_CLARIFICATION | NOT_FOUND"
}`;

export type AssistantReply = {
  intent: string;
  answer: string;
  evidence_ids: Evidence[];
  medication_ids: number[];
  suggested_action: { type: "LIGHT_COMPARTMENT"; medication_id: number; compartment: number } | null;
  safety_status: "ALLOWED" | "REFUSED_MEDICAL" | "NEEDS_CLARIFICATION" | "NOT_FOUND";
  sources: SourceCard[];
};

export type SourceCard = {
  type: "medication" | "cabinet_event";
  id: number;
  title: string;
  subtitle: string | null;
  verification_status: string | null;
  compartment: number | null;
};

const FALLBACK: Omit<AssistantReply, "sources"> = {
  intent: "OTHER",
  answer: "I could not find that in the confirmed Pillio inventory.",
  evidence_ids: [],
  medication_ids: [],
  suggested_action: null,
  safety_status: "NOT_FOUND",
};

type Msg = Parameters<typeof chat>[0]["messages"][number];

export async function askAssistant(question: string): Promise<AssistantReply> {
  const messages: Msg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: question.slice(0, 1000) },
  ];

  // Everything tools returned this conversation — the grounding set.
  const seenEvidence = new Map<string, Evidence>();
  const seenMedIds = new Set<number>();

  let content = "";
  for (let round = 0; round < 5; round++) {
    const res = await chat({ messages, tools: TOOL_SCHEMAS, maxTokens: 700 });
    if (res.toolCalls.length === 0) {
      content = res.content;
      break;
    }
    messages.push({ role: "assistant", content: res.content || "", tool_calls: res.toolCalls });
    for (const call of res.toolCalls) {
      const result = await runTool(call);
      for (const ev of result.evidence) {
        seenEvidence.set(`${ev.type}:${ev.id}`, ev);
        if (ev.type === "medication") seenMedIds.add(ev.id);
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result.data ?? null),
      });
    }
  }

  const parsed = parseReply(content);
  const reply = validate(parsed, seenEvidence, seenMedIds);
  const sources = await buildSources(reply.evidence_ids);

  void recordAudit({
    feature: "assistant",
    promptVersion: ASSISTANT_PROMPT_VERSION,
    inputRefs: { question, evidence: [...seenEvidence.keys()] },
    output: { ...reply },
  });

  return { ...reply, sources };
}

async function runTool(call: ToolCall): Promise<{ data: unknown; evidence: Evidence[] }> {
  const impl = TOOL_IMPLS[call.function.name];
  if (!impl) return { data: { error: "unknown tool" }, evidence: [] };
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
  } catch {
    // leave args empty — tools treat missing args as empty queries
  }
  try {
    return await impl(args);
  } catch (error) {
    console.error(`Assistant tool ${call.function.name} failed:`, error);
    return { data: { error: "tool failed" }, evidence: [] };
  }
}

function parseReply(content: string): Omit<AssistantReply, "sources"> | null {
  if (!content) return null;
  const jsonText = content.replace(/^```json?\s*|\s*```$/g, "").trim();
  try {
    const raw = JSON.parse(jsonText) as Partial<AssistantReply>;
    if (typeof raw.answer !== "string" || !raw.answer.trim()) return null;
    return {
      intent: typeof raw.intent === "string" ? raw.intent : "OTHER",
      answer: raw.answer.trim(),
      evidence_ids: Array.isArray(raw.evidence_ids)
        ? raw.evidence_ids.filter(
            (e): e is Evidence =>
              e != null &&
              (e.type === "medication" || e.type === "cabinet_event") &&
              Number.isFinite(Number(e.id)),
          )
        : [],
      medication_ids: Array.isArray(raw.medication_ids)
        ? raw.medication_ids.map(Number).filter(Number.isFinite)
        : [],
      suggested_action:
        raw.suggested_action && raw.suggested_action.type === "LIGHT_COMPARTMENT"
          ? {
              type: "LIGHT_COMPARTMENT",
              medication_id: Number(raw.suggested_action.medication_id),
              compartment: Number(raw.suggested_action.compartment),
            }
          : null,
      safety_status:
        raw.safety_status === "REFUSED_MEDICAL" ||
        raw.safety_status === "NEEDS_CLARIFICATION" ||
        raw.safety_status === "NOT_FOUND"
          ? raw.safety_status
          : "ALLOWED",
    };
  } catch {
    return null;
  }
}

// Grounding gate: every cited id must have come back from a tool this turn,
// and any suggested action must reference a medication the tools returned.
function validate(
  parsed: Omit<AssistantReply, "sources"> | null,
  seenEvidence: Map<string, Evidence>,
  seenMedIds: Set<number>,
): Omit<AssistantReply, "sources"> {
  if (!parsed) return { ...FALLBACK };
  if (parsed.safety_status === "REFUSED_MEDICAL") {
    return { ...parsed, evidence_ids: [], medication_ids: [], suggested_action: null };
  }
  const evidence = parsed.evidence_ids.filter((e) => seenEvidence.has(`${e.type}:${e.id}`));
  const medIds = parsed.medication_ids.filter((id) => seenMedIds.has(id));
  let action = parsed.suggested_action;
  if (action && !seenMedIds.has(action.medication_id)) action = null;
  // A factual answer with zero valid evidence is not allowed to stand.
  if (evidence.length === 0 && parsed.safety_status === "ALLOWED") {
    return { ...FALLBACK, intent: parsed.intent };
  }
  return { ...parsed, evidence_ids: evidence, medication_ids: medIds, suggested_action: action };
}

async function buildSources(evidence: Evidence[]): Promise<SourceCard[]> {
  const { prisma } = await import("@/lib/db");
  const medIds = evidence.filter((e) => e.type === "medication").map((e) => e.id);
  const eventIds = evidence.filter((e) => e.type === "cabinet_event").map((e) => e.id);
  const [meds, events] = await Promise.all([
    medIds.length ? prisma.medication.findMany({ where: { id: { in: medIds } } }) : [],
    eventIds.length ? prisma.activityEvent.findMany({ where: { id: { in: eventIds } } }) : [],
  ]);
  return [
    ...meds.map((m) => ({
      type: "medication" as const,
      id: m.id,
      title: m.brandName,
      subtitle: [m.dosage, m.personName ?? "Household"].filter(Boolean).join(" · ") || null,
      verification_status: m.verificationStatus,
      compartment: m.compartment,
    })),
    ...events.map((e) => ({
      type: "cabinet_event" as const,
      id: e.id,
      title: `Event: ${e.type}`,
      subtitle: e.createdAt.toLocaleString(),
      verification_status: null,
      compartment: e.compartment,
    })),
  ];
}
