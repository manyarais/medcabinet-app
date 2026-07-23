// Household membership — Clerk identity ↔ active household + role.

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Household, HouseholdMember } from "@/generated/prisma";
import {
  fetchClerkIdentity,
  identityFromCurrentUser,
} from "@/lib/clerkUsers";
import { prisma } from "@/lib/db";
import {
  hasCapability,
  isMemberRole,
  type Capability,
  type MemberRole,
} from "@/lib/permissions";
import { DEFAULT_CALL_TEMPLATE } from "@/lib/reminderSettings";

export const ACTIVE_HOUSEHOLD_COOKIE = "pillio-active-household";

export type HouseholdRow = Household;

export type MembershipContext = {
  userId: string;
  membership: HouseholdMember;
  household: Household;
  role: MemberRole;
  status: string;
};

function unauthorized(): never {
  throw NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function forbidden(message = "Forbidden."): never {
  throw NextResponse.json({ error: message }, { status: 403 });
}

async function createOwnedHousehold(userId: string): Promise<MembershipContext> {
  const identity = (await identityFromCurrentUser()) ?? (await fetchClerkIdentity(userId));
  const name =
    identity.displayName ||
    identity.email ||
    "My household";

  const household = await prisma.household.create({
    data: {
      clerkUserId: userId,
      name,
      reminderSettings: {
        create: { callMessageTemplate: DEFAULT_CALL_TEMPLATE },
      },
      members: {
        create: {
          clerkUserId: userId,
          role: "owner",
          status: "active",
          canSeeSymptomHistory: true,
          displayName: identity.displayName,
          email: identity.email,
        },
      },
    },
    include: { members: true },
  });

  const membership = household.members.find((m) => m.clerkUserId === userId)!;
  return {
    userId,
    membership,
    household: {
      id: household.id,
      name: household.name,
      clerkUserId: household.clerkUserId,
      scanToken: household.scanToken,
      createdAt: household.createdAt,
    },
    role: "owner",
    status: "active",
  };
}

async function ensureOwnerMemberForOwnedHousehold(
  userId: string,
): Promise<HouseholdMember | null> {
  const owned = await prisma.household.findUnique({
    where: { clerkUserId: userId },
  });
  if (!owned) return null;

  const identity =
    (await identityFromCurrentUser()) ?? (await fetchClerkIdentity(userId));

  return prisma.householdMember.upsert({
    where: {
      householdId_clerkUserId: {
        householdId: owned.id,
        clerkUserId: userId,
      },
    },
    create: {
      householdId: owned.id,
      clerkUserId: userId,
      role: "owner",
      status: "active",
      canSeeSymptomHistory: true,
      displayName: identity.displayName,
      email: identity.email,
    },
    update: {},
  });
}

/** Refresh Clerk identity snapshot when the signed-in user hits the app. */
async function refreshMembershipIdentity(
  membership: HouseholdMember,
): Promise<HouseholdMember> {
  const identity = await identityFromCurrentUser();
  if (!identity) return membership;
  if (
    membership.displayName === identity.displayName &&
    membership.email === identity.email
  ) {
    return membership;
  }
  return prisma.householdMember.update({
    where: { id: membership.id },
    data: {
      displayName: identity.displayName,
      email: identity.email,
    },
  });
}

/**
 * Resolve signed-in user to an active household membership.
 * Supports multiple households; active choice stored in cookie.
 */
export async function getMembership(): Promise<MembershipContext> {
  const { userId } = await auth();
  if (!userId) unauthorized();

  await ensureOwnerMemberForOwnedHousehold(userId);

  let members = await prisma.householdMember.findMany({
    where: { clerkUserId: userId },
    include: { household: true },
    orderBy: { createdAt: "asc" },
  });

  if (members.length === 0) {
    return createOwnedHousehold(userId);
  }

  const activeMembers = members.filter((m) => m.status === "active");
  if (activeMembers.length === 0) {
    forbidden(
      "Your join request is pending approval. Ask the household owner to approve you.",
    );
  }

  const jar = await cookies();
  const preferredId = jar.get(ACTIVE_HOUSEHOLD_COOKIE)?.value;

  let chosen =
    (preferredId
      ? activeMembers.find((m) => m.householdId === preferredId)
      : undefined) ??
    activeMembers.find((m) => m.household.clerkUserId === userId) ??
    activeMembers[0]!;

  if (!isMemberRole(chosen.role)) {
    forbidden("Invalid membership role.");
  }

  const membership = await refreshMembershipIdentity(chosen);

  return {
    userId,
    membership,
    household: chosen.household,
    role: chosen.role,
    status: chosen.status,
  };
}

export async function getMembershipOrNull(): Promise<MembershipContext | null> {
  const { userId } = await auth();
  if (!userId) return null;
  try {
    return await getMembership();
  } catch {
    return null;
  }
}

/** @deprecated Prefer getMembership(); kept for call-site compatibility. */
export async function getHousehold(): Promise<HouseholdRow> {
  return (await getMembership()).household;
}

export async function getHouseholdOrNull(): Promise<HouseholdRow | null> {
  const ctx = await getMembershipOrNull();
  return ctx?.household ?? null;
}

export async function requireCapability(
  capability: Capability,
): Promise<MembershipContext> {
  const ctx = await getMembership();
  if (
    !hasCapability(ctx.role, capability, {
      canSeeSymptomHistory: ctx.membership.canSeeSymptomHistory,
    })
  ) {
    forbidden(`This action requires a higher role (${capability}).`);
  }
  return ctx;
}

export async function listMemberships() {
  const { userId } = await auth();
  if (!userId) unauthorized();

  await ensureOwnerMemberForOwnedHousehold(userId);

  const rows = await prisma.householdMember.findMany({
    where: { clerkUserId: userId, status: "active" },
    include: {
      household: { select: { id: true, name: true, clerkUserId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((m) => ({
    membershipId: m.id,
    householdId: m.householdId,
    name: m.household.name,
    role: m.role,
    canSeeSymptomHistory: m.canSeeSymptomHistory,
    /** True when this user created / owns the household record. */
    isOwned: m.household.clerkUserId === userId,
  }));
}

export async function setActiveHouseholdId(householdId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) unauthorized();

  const membership = await prisma.householdMember.findFirst({
    where: {
      clerkUserId: userId,
      householdId,
      status: "active",
    },
  });
  if (!membership) forbidden("You are not an active member of that household.");

  const jar = await cookies();
  jar.set(ACTIVE_HOUSEHOLD_COOKIE, householdId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
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

/**
 * ESP32 / machine clients authenticate with `x-scan-token`.
 * In-app UI (phone camera, confirm, clear) uses the signed-in household instead.
 */
export async function resolveScanHousehold(
  request: Request,
  capability: Capability = "mutateMeds",
): Promise<HouseholdRow> {
  const token = scanTokenFromRequest(request);
  if (token) {
    const household = await getHouseholdByScanToken(token);
    if (!household) unauthorized();
    return household;
  }
  const { household } = await requireCapability(capability);
  return household;
}

export function randomInviteCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
