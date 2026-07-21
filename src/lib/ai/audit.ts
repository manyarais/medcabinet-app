// Append-only audit trail for AI calls: which model + prompt version ran,
// what records went in, what came out. Auditing must never break the feature.

import { prisma } from "@/lib/db";
import { AI_MODEL } from "@/lib/ai/openai";

export type AiFeature =
  | "assistant"
  | "active_scan"
  | "normalize"
  | "summary"
  | "plain_language"
  | "size_estimate";

export async function recordAudit(entry: {
  feature: AiFeature;
  promptVersion: string;
  inputRefs: unknown;
  output: unknown;
  confidence?: number | null;
}): Promise<void> {
  try {
    await prisma.aiAudit.create({
      data: {
        feature: entry.feature,
        modelVersion: AI_MODEL,
        promptVersion: entry.promptVersion,
        inputRefs: JSON.stringify(entry.inputRefs ?? null),
        output: typeof entry.output === "string" ? entry.output : JSON.stringify(entry.output ?? null),
        confidence: entry.confidence ?? null,
      },
    });
  } catch (error) {
    console.error("AI audit write failed:", error);
  }
}
