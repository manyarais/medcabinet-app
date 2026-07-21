// Deterministic compartment assignment. The AI side (sizeEstimate.ts) only
// estimates the package; choosing the bay is plain geometry + rules, and it
// keeps working even when the AI estimate is unavailable (fall back to
// package-type presets). Dimensions are per-size presets — measure the real
// cabinet and adjust here.

import { COMPARTMENTS, type CompartmentSize } from "@/lib/compartments";

export type PackageType =
  | "SMALL_CYLINDRICAL_BOTTLE"
  | "STANDARD_CYLINDRICAL_BOTTLE"
  | "LARGE_CYLINDRICAL_BOTTLE"
  | "RECTANGULAR_BOX"
  | "LIQUID_BOTTLE"
  | "TUBE"
  | "UNKNOWN";

export type Dimensions = { width: number; depth: number; height: number };

/** Internal chamber + door opening per bay size preset (mm). */
export const BAY_DIMENSIONS: Record<CompartmentSize, { internal: Dimensions; door: { width: number; height: number } }> = {
  thin:   { internal: { width: 55,  depth: 90, height: 130 }, door: { width: 50,  height: 120 } },
  medium: { internal: { width: 80,  depth: 90, height: 130 }, door: { width: 74,  height: 120 } },
  big:    { internal: { width: 120, depth: 95, height: 160 }, door: { width: 112, height: 150 } },
};

/** Clearance margins (mm) — from spec: never assign a 48 mm bottle to a 48 mm gap. */
export const MARGINS = {
  horizontal: 8,
  vertical: 10,
  door: 6,
  fingerAccess: 12, // wanted, not required: extra room to grab the bottle
};

/** Typical dimensions per package type — fallback when no estimate exists. */
export const TYPE_PRESETS: Record<PackageType, Dimensions> = {
  SMALL_CYLINDRICAL_BOTTLE:    { width: 35, depth: 35, height: 65 },
  STANDARD_CYLINDRICAL_BOTTLE: { width: 48, depth: 48, height: 95 },
  LARGE_CYLINDRICAL_BOTTLE:    { width: 62, depth: 62, height: 120 },
  RECTANGULAR_BOX:             { width: 75, depth: 40, height: 105 },
  LIQUID_BOTTLE:               { width: 60, depth: 60, height: 140 },
  TUBE:                        { width: 35, depth: 35, height: 130 },
  UNKNOWN:                     { width: 55, depth: 55, height: 110 },
};

export type FitCheck = {
  fits: boolean;
  snug: boolean; // fits, but within fingerAccess of a limit — confirm with user
  reason: string;
};

/** Pure geometry: does (dims + uncertainty) fit this bay size with margins? */
export function checkFit(
  size: CompartmentSize,
  dims: Dimensions,
  uncertainty: Dimensions = { width: 0, depth: 0, height: 0 },
): FitCheck {
  const bay = BAY_DIMENSIONS[size];
  const w = dims.width + uncertainty.width;
  const d = dims.depth + uncertainty.depth;
  const h = dims.height + uncertainty.height;

  // The bottle enters through the door, so the door opening binds first.
  const doorW = bay.door.width - MARGINS.door;
  const doorH = bay.door.height - MARGINS.door;
  const minFootprint = Math.min(w, d); // it can be turned to its narrow side
  if (minFootprint > doorW) return { fits: false, snug: false, reason: `too wide for the ${size} bay door (${minFootprint} mm vs ${doorW} mm usable)` };
  if (h > doorH) return { fits: false, snug: false, reason: `too tall for the ${size} bay door (${h} mm vs ${doorH} mm usable)` };

  const innerW = bay.internal.width - MARGINS.horizontal;
  const innerD = bay.internal.depth - MARGINS.horizontal;
  const innerH = bay.internal.height - MARGINS.vertical;
  if (w > innerW || d > innerD) return { fits: false, snug: false, reason: `too wide for the ${size} bay interior` };
  if (h > innerH) return { fits: false, snug: false, reason: `too tall for the ${size} bay interior` };

  const snug =
    w > innerW - MARGINS.fingerAccess ||
    h > innerH - MARGINS.fingerAccess ||
    minFootprint > doorW - MARGINS.fingerAccess;
  return { fits: true, snug, reason: snug ? "fits, but with little room to spare" : "fits with comfortable clearance" };
}

export type AssignmentInput = {
  dims: Dimensions;
  uncertainty?: Dimensions;
  occupied: Set<number>; // compartment numbers already holding a medication
};

export type AssignmentResult = {
  recommended_compartment: number | null;
  alternatives: number[];
  requires_user_confirmation: boolean;
  assignment_reason: string;
};

// Wasted-volume proxy for "prefer the smallest adequate bay".
const SIZE_RANK: Record<CompartmentSize, number> = { thin: 0, medium: 1, big: 2 };

/**
 * Deterministic engine: eliminate occupied / too-small bays, then prefer the
 * smallest bay that fits (preserving big bays for big packages), breaking
 * ties by lower compartment number (lower = easier to reach on this cabinet).
 */
export function recommendCompartment(input: AssignmentInput): AssignmentResult {
  const uncertainty = input.uncertainty ?? { width: 0, depth: 0, height: 0 };
  const candidates: Array<{ number: number; size: CompartmentSize; fit: FitCheck }> = [];

  for (const bay of COMPARTMENTS) {
    if (bay.isScanner || input.occupied.has(bay.number)) continue;
    const fit = checkFit(bay.size, input.dims, uncertainty);
    if (fit.fits) candidates.push({ number: bay.number, size: bay.size, fit });
  }

  if (candidates.length === 0) {
    return {
      recommended_compartment: null,
      alternatives: [],
      requires_user_confirmation: true,
      assignment_reason: "No free compartment fits this package with the required clearance.",
    };
  }

  candidates.sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size] || a.number - b.number);
  const best = candidates[0];
  return {
    recommended_compartment: best.number,
    alternatives: candidates.slice(1, 3).map((c) => c.number),
    requires_user_confirmation: best.fit.snug,
    assignment_reason: `Compartment ${best.number} is the smallest available bay that fits the estimated package with the required clearance (${best.fit.reason}).`,
  };
}
