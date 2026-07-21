// AI bottle-size estimation. Calibration comes from the turntable: its
// diameter is known, and the bottle sits on it, so the model reports the
// bottle's width/height as fractions of the turntable's visible width and we
// convert to millimeters. Uncertainty scales with the model's own confidence
// and anything suspicious (edges cut off, transparent bottle, disagreement
// across photos). Assignment itself is deterministic (compartmentFit.ts).

import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { chatJSON, imagePart, aiAvailable } from "@/lib/ai/openai";
import { recordAudit } from "@/lib/ai/audit";
import {
  recommendCompartment,
  TYPE_PRESETS,
  type Dimensions,
  type PackageType,
} from "@/lib/ai/compartmentFit";

export const SIZE_PROMPT_VERSION = "size-estimate-v1";

/** Measure the real turntable and set TURNTABLE_DIAMETER_MM to match. */
const TURNTABLE_DIAMETER_MM = Number(process.env.TURNTABLE_DIAMETER_MM ?? 90);

export type SizeEstimate = {
  package_type: PackageType;
  estimated_dimensions_mm: Dimensions;
  dimension_uncertainty_mm: Dimensions;
  confidence: number;
  source: "ai_calibrated" | "type_preset" | "user";
  recommended_compartment_id: number | null;
  alternative_compartment_ids: number[];
  assignment_reason: string;
  requires_user_confirmation: boolean;
};

type VisionReply = {
  package_type?: string;
  width_vs_turntable?: number; // bottle width / turntable visible width
  height_vs_turntable?: number; // bottle height / turntable visible width
  turntable_fully_visible?: boolean;
  object_cut_off?: boolean;
  transparent?: boolean;
  confidence?: number;
};

const VALID_TYPES = new Set<PackageType>([
  "SMALL_CYLINDRICAL_BOTTLE",
  "STANDARD_CYLINDRICAL_BOTTLE",
  "LARGE_CYLINDRICAL_BOTTLE",
  "RECTANGULAR_BOX",
  "LIQUID_BOTTLE",
  "TUBE",
  "UNKNOWN",
]);

const SIZE_PROMPT =
  `Photos show a medicine package standing on a circular turntable platform. ` +
  `Classify the package as one of: SMALL_CYLINDRICAL_BOTTLE, STANDARD_CYLINDRICAL_BOTTLE, ` +
  `LARGE_CYLINDRICAL_BOTTLE, RECTANGULAR_BOX, LIQUID_BOTTLE, TUBE, UNKNOWN. ` +
  `Then estimate proportions USING THE TURNTABLE AS THE RULER: width_vs_turntable = package ` +
  `width divided by the turntable's visible width; height_vs_turntable = package height ` +
  `divided by the turntable's visible width. Report turntable_fully_visible, object_cut_off ` +
  `(package touches the image edge), transparent, and confidence 0-1. Reply JSON only: ` +
  `{"package_type":"...","width_vs_turntable":0.5,"height_vs_turntable":1.1,` +
  `"turntable_fully_visible":true,"object_cut_off":false,"transparent":false,"confidence":0.9}`;

async function loadPhotos(photoUrls: string[]): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (const url of photoUrls.slice(0, 3)) {
    if (!url.startsWith("/scan-photos/")) continue;
    try {
      out.push(await readFile(path.join(process.cwd(), "public", url)));
    } catch {
      // photo pruned — skip
    }
  }
  return out;
}

/**
 * Estimate from a medication's stored scan photos and recommend a bay.
 * Falls back to package-type presets (or UNKNOWN preset) when the AI or the
 * photos are unavailable — the deterministic engine always answers.
 */
export async function estimateAndRecommend(medicationId: number): Promise<SizeEstimate> {
  const med = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!med) throw new Error("Medication not found.");

  const occupiedRows = await prisma.medication.findMany({
    where: { compartment: { not: null }, status: { not: "disposed" }, id: { not: medicationId } },
    select: { compartment: true },
  });
  const occupied = new Set(occupiedRows.map((r) => r.compartment as number));

  let packageType: PackageType = "UNKNOWN";
  let dims: Dimensions = TYPE_PRESETS.UNKNOWN;
  let uncertainty: Dimensions = { width: 10, depth: 10, height: 15 };
  let confidence = 0.3;
  let source: SizeEstimate["source"] = "type_preset";

  const photos = aiAvailable() ? await loadPhotos(parsePhotoUrls(med.photoPaths)) : [];
  if (photos.length > 0) {
    const reply = await chatJSON<VisionReply>({
      system: SIZE_PROMPT,
      user: [
        { type: "text", text: `${photos.length} photos of the same package from different angles.` },
        ...photos.map((p) => imagePart(p, "low")),
      ],
      maxTokens: 250,
    }).catch(() => null);

    if (reply) {
      const type = String(reply.package_type ?? "UNKNOWN") as PackageType;
      packageType = VALID_TYPES.has(type) ? type : "UNKNOWN";
      const widthRatio = clampRatio(reply.width_vs_turntable);
      const heightRatio = clampRatio(reply.height_vs_turntable);
      if (widthRatio && heightRatio && reply.turntable_fully_visible !== false) {
        const width = Math.round(widthRatio * TURNTABLE_DIAMETER_MM);
        const height = Math.round(heightRatio * TURNTABLE_DIAMETER_MM);
        // Cylinders: depth == width. Boxes seen from one angle: assume depth
        // is the narrow preset ratio, flagged in the uncertainty.
        const depth = packageType === "RECTANGULAR_BOX" ? Math.round(width * 0.55) : width;
        dims = { width, depth, height };
        confidence = Math.max(0, Math.min(1, Number(reply.confidence ?? 0.5)));
        const shaky = reply.object_cut_off || reply.transparent || confidence < 0.6;
        const base = shaky ? 8 : 3;
        uncertainty = {
          width: base,
          depth: packageType === "RECTANGULAR_BOX" ? base + 8 : base,
          height: base + 1,
        };
        source = "ai_calibrated";
      } else {
        dims = TYPE_PRESETS[packageType];
        confidence = Math.min(0.5, Number(reply.confidence ?? 0.4));
      }
    }
  }

  const assignment = recommendCompartment({ dims, uncertainty, occupied });
  const result: SizeEstimate = {
    package_type: packageType,
    estimated_dimensions_mm: dims,
    dimension_uncertainty_mm: uncertainty,
    confidence,
    source,
    recommended_compartment_id: assignment.recommended_compartment,
    alternative_compartment_ids: assignment.alternatives,
    assignment_reason: assignment.assignment_reason,
    // Low estimate confidence or a snug fit both need a human eye.
    requires_user_confirmation: assignment.requires_user_confirmation || confidence < 0.6,
  };

  void recordAudit({
    feature: "size_estimate",
    promptVersion: SIZE_PROMPT_VERSION,
    inputRefs: { medicationId, photos: photos.length, turntableMm: TURNTABLE_DIAMETER_MM },
    output: result,
    confidence,
  });
  return result;
}

/** User override: they picked a size category by eye. Stored as confirmed. */
export async function recommendFromUserType(medicationId: number, packageType: PackageType): Promise<SizeEstimate> {
  const occupiedRows = await prisma.medication.findMany({
    where: { compartment: { not: null }, status: { not: "disposed" }, id: { not: medicationId } },
    select: { compartment: true },
  });
  const occupied = new Set(occupiedRows.map((r) => r.compartment as number));
  const dims = TYPE_PRESETS[packageType] ?? TYPE_PRESETS.UNKNOWN;
  const assignment = recommendCompartment({ dims, uncertainty: { width: 5, depth: 5, height: 8 }, occupied });
  return {
    package_type: packageType,
    estimated_dimensions_mm: dims,
    dimension_uncertainty_mm: { width: 5, depth: 5, height: 8 },
    confidence: 1,
    source: "user",
    recommended_compartment_id: assignment.recommended_compartment,
    alternative_compartment_ids: assignment.alternatives,
    assignment_reason: assignment.assignment_reason,
    requires_user_confirmation: assignment.requires_user_confirmation,
  };
}

function clampRatio(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0.05 || n > 5) return null;
  return n;
}

function parsePhotoUrls(photoPaths: string | null): string[] {
  if (!photoPaths) return [];
  try {
    const parsed = JSON.parse(photoPaths) as unknown;
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}
