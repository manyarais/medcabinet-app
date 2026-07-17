// Shared helpers for cabinet assign/update validation.
// Rejects invalid / occupied compartments (no silent overwrites).

import {
  isScannerCompartment,
  isValidAssignableCompartment,
  sizeForCompartment,
} from "@/lib/compartments";
import { prisma } from "@/lib/db";

export type OccupancyMap = Map<number, { id: number; brandName: string }>;

export async function getOccupiedCompartments(
  excludeMedicationId?: number,
): Promise<OccupancyMap> {
  const medications = await prisma.medication.findMany({
    where: {
      compartment: { not: null },
      ...(excludeMedicationId != null ? { id: { not: excludeMedicationId } } : {}),
    },
    select: { id: true, brandName: true, compartment: true },
  });

  const map: OccupancyMap = new Map();
  for (const med of medications) {
    if (med.compartment != null) {
      map.set(med.compartment, { id: med.id, brandName: med.brandName });
    }
  }
  return map;
}

export type CompartmentCheckResult =
  | { ok: true; compartmentSize: string }
  | { ok: false; status: number; error: string };

export function validateAssignableCompartment(
  compartment: number,
  occupied: OccupancyMap,
): CompartmentCheckResult {
  if (!Number.isInteger(compartment)) {
    return { ok: false, status: 400, error: "Compartment must be a whole number." };
  }

  if (isScannerCompartment(compartment)) {
    return {
      ok: false,
      status: 400,
      error: `Compartment ${compartment} is reserved and cannot hold a medication.`,
    };
  }

  if (!isValidAssignableCompartment(compartment)) {
    return {
      ok: false,
      status: 400,
      error: `Compartment must be a valid slot from 1–18.`,
    };
  }

  const occupant = occupied.get(compartment);
  if (occupant) {
    return {
      ok: false,
      status: 409,
      error: `Compartment ${compartment} is already occupied by ${occupant.brandName}. Pick another compartment.`,
    };
  }

  return { ok: true, compartmentSize: sizeForCompartment(compartment) };
}
