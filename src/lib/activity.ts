// Append-only activity logging. Uses the neutral word "accessed"/"out" — we
// never claim a medication was *taken* unless the user logged a dose.

import { prisma } from "@/lib/db";

export type ActivityType =
  | "scan_saved"
  | "scan_confirmed"
  | "scan_discarded"
  | "disposed"
  | "out"
  | "returned"
  | "flash"
  | "travel_pack"
  | "travel_return"
  | "demo_reset";

export async function logActivity(
  type: ActivityType,
  extra: { medicationId?: number | null; compartment?: number | null; detail?: string } = {},
): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        type,
        medicationId: extra.medicationId ?? null,
        compartment: extra.compartment ?? null,
        detail: extra.detail ?? null,
      },
    });
  } catch (error) {
    // Logging must never break the action being logged.
    console.error("Activity log failed:", error);
  }
}
