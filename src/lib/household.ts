// Household resolution — Clerk identity ↔ our DB tenant.

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { DEFAULT_CALL_TEMPLATE } from "@/lib/reminderSettings";
import type { Household } from "@/generated/prisma";
import { NextResponse } from "next/server";

export type HouseholdRow = Household;

/**
 * Resolve the signed-in Clerk user to a Household.
 * Auto-creates on first sign-in (name from Clerk profile).
 * Throws Response 401 when unauthenticated (for API routes).
 */
export async function getHousehold(): Promise<HouseholdRow> {
  const { userId } = await auth();
  if (!userId) {
    throw NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const existing = await prisma.household.findUnique({
    where: { clerkUserId: userId },
  });
  if (existing) return existing;

  const user = await currentUser();
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "My household";

  return prisma.household.create({
    data: {
      clerkUserId: userId,
      name,
      reminderSettings: {
        create: { callMessageTemplate: DEFAULT_CALL_TEMPLATE },
      },
    },
  });
}

/** Same as getHousehold but returns null instead of throwing (server pages). */
export async function getHouseholdOrNull(): Promise<HouseholdRow | null> {
  const { userId } = await auth();
  if (!userId) return null;
  try {
    return await getHousehold();
  } catch {
    return null;
  }
}

export async function getHouseholdByScanToken(
  token: string | null | undefined,
): Promise<HouseholdRow | null> {
  const trimmed = token?.trim();
  if (!trimmed) return null;
  return prisma.household.findUnique({ where: { scanToken: trimmed } });
}

export function scanTokenFromRequest(request: Request): string | null {
  return request.headers.get("x-scan-token") ?? request.headers.get("X-Scan-Token");
}
