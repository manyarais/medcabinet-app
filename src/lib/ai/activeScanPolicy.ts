// Pure decision logic for the active scanner: evidence accumulation across
// frames and the next-action policy. No I/O here — the engine (activeScan.ts)
// feeds it frame analyses and executes what it decides, so the whole policy
// is unit-testable. Deterministic by design: the AI model only reports what
// it saw in a frame; it never chooses motor actions.

export const REQUIRED_FIELDS = [
  "medication_name",
  "strength",
  "instructions",
  "expiration_date",
  "owner_name",
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

// Fields a label may simply not have (OTC bottles: no owner; many: no expiry
// visible). After a full revolution without a sighting they become
// NOT_PRESENT_ON_LABEL instead of blocking completion forever.
export const OPTIONAL_ON_LABEL: RequiredField[] = ["owner_name", "expiration_date", "instructions"];

export const CONFIDENCE_ACCEPT = 0.75;
export const MAX_ROTATION_DEG = 420; // full turn + slack for step error
export const MAX_FRAMES = 12;
export const MAX_RECAPTURES_PER_SPOT = 1;

export type ScanAction =
  | { action: "CAPTURE_AGAIN"; reason: string }
  | { action: "ROTATE_CLOCKWISE_5"; reason: string }
  | { action: "ROTATE_CLOCKWISE_10"; reason: string }
  | { action: "ROTATE_CLOCKWISE_20"; reason: string }
  | { action: "ROTATE_CLOCKWISE_30"; reason: string }
  | { action: "STOP_SUCCESS"; reason: string }
  | { action: "STOP_REVIEW_REQUIRED"; reason: string };

export function rotationDegrees(action: ScanAction["action"]): number {
  const m = action.match(/_(\d+)$/);
  return m ? Number(m[1]) : 0;
}

export type FrameFieldReading = {
  value: string | null;
  confidence: number; // 0..1
  cut_off_at_edge: boolean;
};

export type FrameAnalysis = {
  frameIndex: number;
  angleDeg: number; // cumulative rotation when captured
  byteSize: number;
  quality: { blurry: boolean; glare: boolean; unreadable: boolean };
  fields: Partial<Record<RequiredField, FrameFieldReading>>;
  textTokens: string[]; // distinct words the model read in this frame
};

export type FieldEvidence = {
  candidate: string | null;
  confidence: number;
  supporting_frames: number[];
  conflicting: string[] | null;
  not_present: boolean;
};

export type EvidenceAccumulator = Record<RequiredField, FieldEvidence>;

export function emptyAccumulator(): EvidenceAccumulator {
  const out = {} as EvidenceAccumulator;
  for (const f of REQUIRED_FIELDS) {
    out[f] = { candidate: null, confidence: 0, supporting_frames: [], conflicting: null, not_present: false };
  }
  return out;
}

function valuesAgree(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const na = norm(a);
  const nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Merge one frame's readings into the running evidence. Agreement between
 * frames raises confidence; disagreement marks the field conflicting (the
 * spec forbids silently picking a side).
 */
export function mergeFrame(acc: EvidenceAccumulator, frame: FrameAnalysis): EvidenceAccumulator {
  const next: EvidenceAccumulator = JSON.parse(JSON.stringify(acc)) as EvidenceAccumulator;
  for (const field of REQUIRED_FIELDS) {
    const reading = frame.fields[field];
    if (!reading?.value || reading.confidence <= 0.2) continue;
    const slot = next[field];
    if (!slot.candidate) {
      slot.candidate = reading.value;
      slot.confidence = reading.confidence;
      slot.supporting_frames = [frame.frameIndex];
      continue;
    }
    if (valuesAgree(slot.candidate, reading.value)) {
      // Two frames agreeing beats either alone; keep the longer reading.
      if (reading.value.length > slot.candidate.length) slot.candidate = reading.value;
      slot.confidence = Math.min(0.99, Math.max(slot.confidence, reading.confidence) + 0.1);
      slot.supporting_frames = [...new Set([...slot.supporting_frames, frame.frameIndex])];
    } else if (reading.confidence > 0.4) {
      slot.conflicting = [...new Set([...(slot.conflicting ?? []), reading.value])];
    }
  }
  return next;
}

export function missingFields(acc: EvidenceAccumulator): RequiredField[] {
  return REQUIRED_FIELDS.filter(
    (f) => !acc[f].not_present && (acc[f].candidate == null || acc[f].confidence < CONFIDENCE_ACCEPT),
  );
}

export function hasConflicts(acc: EvidenceAccumulator): boolean {
  return REQUIRED_FIELDS.some((f) => (acc[f].conflicting?.length ?? 0) > 0);
}

export function completion(acc: EvidenceAccumulator): number {
  const done = REQUIRED_FIELDS.length - missingFields(acc).length;
  return done / REQUIRED_FIELDS.length;
}

/** After a full revolution, unseen soft fields become NOT_PRESENT_ON_LABEL. */
export function markNotPresentAfterFullTurn(acc: EvidenceAccumulator, totalRotation: number): EvidenceAccumulator {
  if (totalRotation < 360) return acc;
  const next: EvidenceAccumulator = JSON.parse(JSON.stringify(acc)) as EvidenceAccumulator;
  for (const f of OPTIONAL_ON_LABEL) {
    if (!next[f].candidate) next[f].not_present = true;
  }
  return next;
}

/**
 * The next-action policy (spec's "suggested decision policy", deterministic):
 *  - reject + recapture blurry/glare frames (once per spot)
 *  - small steps when a wanted field is cut off at the frame edge
 *  - big steps when a frame added nothing new
 *  - stop on completion, max rotation, or conflict pile-up
 */
export function decideNextAction(input: {
  acc: EvidenceAccumulator;
  frame: FrameAnalysis;
  newTokenCount: number;
  totalRotation: number;
  frameCount: number;
  recapturesAtSpot: number;
}): ScanAction {
  const { frame } = input;
  const acc = markNotPresentAfterFullTurn(input.acc, input.totalRotation);
  const missing = missingFields(acc);

  if (missing.length === 0) {
    return hasConflicts(acc)
      ? { action: "STOP_REVIEW_REQUIRED", reason: "All fields captured but some frames disagree — user review needed." }
      : { action: "STOP_SUCCESS", reason: "All required fields captured with sufficient confidence." };
  }

  if (input.frameCount >= MAX_FRAMES || input.totalRotation >= MAX_ROTATION_DEG) {
    return {
      action: "STOP_REVIEW_REQUIRED",
      reason: `Stopped after ${input.frameCount} frames / ${input.totalRotation}° with ${missing.join(", ")} still uncertain.`,
    };
  }

  if ((frame.quality.blurry || frame.quality.glare || frame.quality.unreadable) &&
      input.recapturesAtSpot < MAX_RECAPTURES_PER_SPOT) {
    return {
      action: "CAPTURE_AGAIN",
      reason: frame.quality.glare
        ? "Glare blocked text in this frame — recapturing before rotating."
        : "Frame was blurry/unreadable — recapturing before rotating.",
    };
  }

  // A wanted field starts at the frame edge → creep forward gently.
  const edgeField = missing.find((f) => frame.fields[f]?.cut_off_at_edge);
  if (edgeField) {
    return {
      action: "ROTATE_CLOCKWISE_10",
      reason: `The ${edgeField.replace(/_/g, " ")} is partially visible at the frame edge — small step to bring it into view.`,
    };
  }

  // Nothing new in this frame → stride further.
  if (input.newTokenCount <= 2 && input.frameCount > 1) {
    return {
      action: "ROTATE_CLOCKWISE_30",
      reason: "This frame added almost no new text — taking a larger step.",
    };
  }

  return {
    action: "ROTATE_CLOCKWISE_20",
    reason: `Still missing ${missing.map((f) => f.replace(/_/g, " ")).join(", ")} — continuing around the label.`,
  };
}

/** Tokens in this frame not seen in any earlier frame. */
export function countNewTokens(seen: Set<string>, tokens: string[]): number {
  let count = 0;
  for (const token of tokens) {
    const t = token.toLowerCase();
    if (t.length >= 3 && !seen.has(t)) count += 1;
  }
  return count;
}

export function addTokens(seen: Set<string>, tokens: string[]): void {
  for (const token of tokens) {
    const t = token.toLowerCase();
    if (t.length >= 3) seen.add(t);
  }
}
