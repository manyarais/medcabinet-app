// Active-vision scan engine. Runs a ScanSession: capture → analyze → decide →
// rotate, until the required fields are captured or the safety limits hit.
// The decision policy lives in activeScanPolicy.ts (pure/deterministic); the
// AI model only reports what each frame shows. Motor movement goes through
// the firmware's clamped /rotate endpoint — never free-form model output.

import { prisma } from "@/lib/db";
import { findDevice, intakeScan, type ScanFields } from "@/lib/scanner";
import { saveScanPhotos } from "@/lib/scanPhotos";
import { logActivity } from "@/lib/activity";
import { chatJSON, imagePart, aiAvailable } from "@/lib/ai/openai";
import { recordAudit } from "@/lib/ai/audit";
import { normalizeMedication } from "@/lib/ai/normalizeMed";
import {
  addTokens,
  countNewTokens,
  decideNextAction,
  emptyAccumulator,
  hasConflicts,
  markNotPresentAfterFullTurn,
  mergeFrame,
  missingFields,
  completion,
  rotationDegrees,
  REQUIRED_FIELDS,
  type EvidenceAccumulator,
  type FrameAnalysis,
  type RequiredField,
  type ScanAction,
} from "@/lib/ai/activeScanPolicy";

export const ACTIVE_SCAN_PROMPT_VERSION = "active-scan-v1";

// HD frames of a lit label are typically 60-250 KB; a nearly-black or
// hopelessly blurred frame compresses far smaller. Cheap deterministic gate
// before spending an AI call.
const MIN_USABLE_BYTES = 15000;
// Old-firmware fallback: ms of timed spin per degree (5600 ms per full turn).
const FALLBACK_MS_PER_DEG = 5600 / 360;

type FrameReply = {
  fields?: Partial<Record<RequiredField, { value?: string | null; confidence?: number; cut_off_at_edge?: boolean }>>;
  tokens?: string[];
  blurry?: boolean;
  glare?: boolean;
  unreadable?: boolean;
};

const FRAME_PROMPT =
  `You see ONE photo of a medicine bottle on a turntable, part of a multi-angle scan. ` +
  `Report ONLY what is readable in THIS frame — never guess or fill in from typical labels. ` +
  `Fields: medication_name (brand or printed name), strength (e.g. "500 mg"), instructions ` +
  `(directions text), expiration_date (as printed), owner_name (patient name on Rx labels). ` +
  `For each field visible give value, confidence 0-1, and cut_off_at_edge=true when the text ` +
  `runs off the left/right edge of the photo. Also list tokens: every distinct word you can ` +
  `read. Set blurry/glare/unreadable honestly. Reply JSON: ` +
  `{"fields":{"medication_name":{"value":"...","confidence":0.9,"cut_off_at_edge":false}},` +
  `"tokens":["..."],"blurry":false,"glare":false,"unreadable":false}`;

async function captureFrame(deviceUrl: string, first: boolean): Promise<Buffer> {
  const url = `${deviceUrl}/jpg?res=hd&store=0${first ? "" : "&fast=1"}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`capture failed (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function rotate(deviceUrl: string, deg: number): Promise<void> {
  // Perf-board firmware has the clamped /rotate; older firmware falls back to
  // a timed /servo spin covering the same angle (clockwise only, like policy).
  const res = await fetch(`${deviceUrl}/rotate?deg=${deg}`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  if (res?.ok) return;
  const ms = Math.round(deg * FALLBACK_MS_PER_DEG);
  const fallback = await fetch(`${deviceUrl}/servo?ms=${ms}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!fallback.ok) throw new Error("turntable rotation failed");
  await new Promise((r) => setTimeout(r, 250)); // settle before next capture
}

async function analyzeFrame(
  jpeg: Buffer,
  frameIndex: number,
  angleDeg: number,
): Promise<FrameAnalysis> {
  // Deterministic gate first — an obviously bad frame skips the AI call.
  if (jpeg.length < MIN_USABLE_BYTES) {
    return {
      frameIndex,
      angleDeg,
      byteSize: jpeg.length,
      quality: { blurry: true, glare: false, unreadable: true },
      fields: {},
      textTokens: [],
    };
  }
  const reply = await chatJSON<FrameReply>({
    system: FRAME_PROMPT,
    user: [{ type: "text", text: `Frame ${frameIndex + 1}.` }, imagePart(jpeg)],
    maxTokens: 500,
  }).catch(() => null);

  const fields: FrameAnalysis["fields"] = {};
  for (const key of REQUIRED_FIELDS) {
    const raw = reply?.fields?.[key];
    if (raw?.value && String(raw.value).trim()) {
      fields[key] = {
        value: String(raw.value).trim(),
        confidence: Math.max(0, Math.min(1, Number(raw.confidence ?? 0.5))),
        cut_off_at_edge: Boolean(raw.cut_off_at_edge),
      };
    }
  }
  return {
    frameIndex,
    angleDeg,
    byteSize: jpeg.length,
    quality: {
      blurry: Boolean(reply?.blurry),
      glare: Boolean(reply?.glare),
      unreadable: Boolean(reply?.unreadable) || reply == null,
    },
    fields,
    textTokens: Array.isArray(reply?.tokens) ? reply.tokens.filter((t) => typeof t === "string") : [],
  };
}

export async function startScanSession(): Promise<string> {
  if (!aiAvailable()) throw new Error("Active scanning needs OPENAI_API_KEY on the server.");
  const session = await prisma.scanSession.create({ data: { status: "CAPTURING" } });
  // Fire the loop in the background; progress is polled from the DB row.
  void runSession(session.id).catch(async (error) => {
    console.error("Active scan session crashed:", error);
    await prisma.scanSession
      .update({
        where: { id: session.id },
        data: { status: "HARDWARE_ERROR", error: error instanceof Error ? error.message : String(error) },
      })
      .catch(() => undefined);
  });
  return session.id;
}

async function runSession(sessionId: string): Promise<void> {
  const deviceUrl = await findDevice();

  let acc: EvidenceAccumulator = emptyAccumulator();
  const frames: FrameAnalysis[] = [];
  const actionsLog: Array<{ action: string; reason: string; at: string }> = [];
  const acceptedPhotos: Buffer[] = [];
  const seenTokens = new Set<string>();
  let totalRotation = 0;
  let recapturesAtSpot = 0;
  let finalAction: ScanAction | null = null;

  const persist = async (status: string) => {
    await prisma.scanSession.update({
      where: { id: sessionId },
      data: {
        status,
        totalRotationDeg: Math.round(totalRotation),
        frames: JSON.stringify(
          frames.map(({ frameIndex, angleDeg, byteSize, quality }) => ({ frameIndex, angleDeg, byteSize, quality })),
        ),
        fields: JSON.stringify(acc),
        actionsLog: JSON.stringify(actionsLog),
      },
    });
  };

  while (!finalAction) {
    await persist("CAPTURING");
    const jpeg = await captureFrame(deviceUrl, frames.length === 0);

    await persist("ANALYZING");
    const frame = await analyzeFrame(jpeg, frames.length, totalRotation);
    frames.push(frame);

    const rejected = frame.quality.unreadable || frame.quality.blurry || frame.quality.glare;
    if (!rejected) {
      acc = mergeFrame(acc, frame);
      acceptedPhotos.push(jpeg);
    }
    const newTokens = countNewTokens(seenTokens, frame.textTokens);
    addTokens(seenTokens, frame.textTokens);

    const decision = decideNextAction({
      acc,
      frame,
      newTokenCount: newTokens,
      totalRotation,
      frameCount: frames.length,
      recapturesAtSpot,
    });
    actionsLog.push({ action: decision.action, reason: decision.reason, at: new Date().toISOString() });

    if (decision.action === "STOP_SUCCESS" || decision.action === "STOP_REVIEW_REQUIRED") {
      finalAction = decision;
      break;
    }
    if (decision.action === "CAPTURE_AGAIN") {
      recapturesAtSpot += 1;
      continue;
    }
    recapturesAtSpot = 0;
    const deg = rotationDegrees(decision.action);
    await persist("ROTATING");
    await rotate(deviceUrl, deg);
    totalRotation += deg;
  }

  acc = markNotPresentAfterFullTurn(acc, totalRotation);

  // Park is a no-op on continuous servos but frees older firmware state.
  void fetch(`${deviceUrl}/servo?deg=0`, { cache: "no-store" }).catch(() => undefined);

  const photoUrls = acceptedPhotos.length
    ? await saveScanPhotos(acceptedPhotos).catch(() => [] as string[])
    : [];

  // Turn the accumulator into the same intake shape as the classic scanner —
  // the review flow, compartment assignment and lights all stay unchanged.
  const name = acc.medication_name.candidate;
  let medicationId: number | null = null;
  if (name) {
    const fields: ScanFields = {
      name,
      dosageStrength: acc.strength.candidate,
      expirationDate: acc.expiration_date.candidate,
      personName: acc.owner_name.candidate,
      rawLabelText: buildTranscript(acc),
    };
    const result = await intakeScan(fields, photoUrls);
    medicationId = result.medication.id;
    await prisma.medication.update({
      where: { id: medicationId },
      data: { verificationStatus: hasConflicts(acc) ? "NEEDS_REVIEW" : "AI_EXTRACTED" },
    });
    void logActivity("scan_saved", {
      medicationId,
      detail: `active scan: ${name} (${frames.length} frames, ${Math.round(totalRotation)}°)`,
    });
    // Kick off normalization in the background; the result lands on the row.
    void normalizeMedication({
      rawName: name,
      strengthText: acc.strength.candidate,
      medicationId,
    })
      .then((norm) =>
        prisma.medication.update({
          where: { id: medicationId! },
          data: {
            normalizedName: norm.normalized_name,
            rxcui: norm.rxcui,
            normalizationStatus: norm.match_status,
            normalizationConfidence: norm.match_confidence,
            normalizationJson: JSON.stringify(norm),
          },
        }),
      )
      .catch(() => undefined);
  }

  const finalStatus =
    finalAction?.action === "STOP_SUCCESS"
      ? "COMPLETE"
      : totalRotation >= 360 && name
        ? "MAX_ROTATION_REACHED"
        : "USER_REVIEW_REQUIRED";

  await prisma.scanSession.update({
    where: { id: sessionId },
    data: {
      status: finalStatus,
      totalRotationDeg: Math.round(totalRotation),
      frames: JSON.stringify(
        frames.map(({ frameIndex, angleDeg, byteSize, quality }) => ({ frameIndex, angleDeg, byteSize, quality })),
      ),
      fields: JSON.stringify(acc),
      actionsLog: JSON.stringify(actionsLog),
      photoUrls: JSON.stringify(photoUrls),
      medicationId,
      error: name ? null : "No medication name could be read from any frame.",
    },
  });

  void recordAudit({
    feature: "active_scan",
    promptVersion: ACTIVE_SCAN_PROMPT_VERSION,
    inputRefs: { sessionId, frames: frames.length, totalRotation, photoUrls },
    output: { status: finalStatus, fields: acc, actions: actionsLog },
    confidence: completion(acc),
  });
}

function buildTranscript(acc: EvidenceAccumulator): string {
  const lines: string[] = [];
  if (acc.owner_name.candidate) lines.push(`PATIENT: ${acc.owner_name.candidate}`);
  if (acc.medication_name.candidate) lines.push(`NAME: ${acc.medication_name.candidate}`);
  if (acc.strength.candidate) lines.push(`STRENGTH: ${acc.strength.candidate}`);
  if (acc.instructions.candidate) lines.push(`DIRECTIONS: ${acc.instructions.candidate}`);
  if (acc.expiration_date.candidate) lines.push(`EXPIRY: ${acc.expiration_date.candidate}`);
  return lines.join("\n");
}

export type ScanSessionView = {
  id: string;
  status: string;
  totalRotationDeg: number;
  frameCount: number;
  completion: number;
  fieldProgress: Array<{
    field: string;
    label: string;
    state: "found" | "scanning" | "not_on_label" | "conflict";
    value: string | null;
  }>;
  lastAction: { action: string; reason: string } | null;
  medicationId: number | null;
  error: string | null;
};

const FIELD_LABELS: Record<RequiredField, string> = {
  medication_name: "Medication name",
  strength: "Strength",
  instructions: "Instructions",
  expiration_date: "Expiration date",
  owner_name: "Owner",
};

export async function getScanSessionView(id: string): Promise<ScanSessionView | null> {
  const row = await prisma.scanSession.findUnique({ where: { id } });
  if (!row) return null;
  let acc: EvidenceAccumulator | null = null;
  try {
    const parsed = JSON.parse(row.fields) as EvidenceAccumulator;
    if (parsed.medication_name) acc = parsed;
  } catch {
    // leave null
  }
  let lastAction: { action: string; reason: string } | null = null;
  try {
    const log = JSON.parse(row.actionsLog) as Array<{ action: string; reason: string }>;
    lastAction = log[log.length - 1] ?? null;
  } catch {
    // leave null
  }
  let frameCount = 0;
  try {
    frameCount = (JSON.parse(row.frames) as unknown[]).length;
  } catch {
    // leave 0
  }
  return {
    id: row.id,
    status: row.status,
    totalRotationDeg: row.totalRotationDeg,
    frameCount,
    completion: acc ? completion(acc) : 0,
    fieldProgress: REQUIRED_FIELDS.map((f) => {
      const slot = acc?.[f];
      const state = !slot
        ? "scanning"
        : slot.conflicting?.length
          ? "conflict"
          : slot.not_present
            ? "not_on_label"
            : slot.candidate && !missingFields(acc!).includes(f)
              ? "found"
              : "scanning";
      return { field: f, label: FIELD_LABELS[f], state, value: slot?.candidate ?? null };
    }),
    lastAction,
    medicationId: row.medicationId,
    error: row.error,
  };
}
