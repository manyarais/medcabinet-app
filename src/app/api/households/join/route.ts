// POST /api/households/join — { code } → pending membership (upsert, no duplicates).

import { auth } from "@clerk/nextjs/server";
import { fetchClerkIdentity } from "@/lib/clerkUsers";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim();
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter a valid 6-digit invite code." },
        { status: 400 },
      );
    }

    const invite = await prisma.householdInvite.findUnique({ where: { code } });
    if (!invite || invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Invite code is invalid or expired." },
        { status: 404 },
      );
    }

    const identity = await fetchClerkIdentity(userId);

    const member = await prisma.householdMember.upsert({
      where: {
        householdId_clerkUserId: {
          householdId: invite.householdId,
          clerkUserId: userId,
        },
      },
      create: {
        householdId: invite.householdId,
        clerkUserId: userId,
        role: "viewer",
        status: "pending",
        canSeeSymptomHistory: false,
        displayName: identity.displayName,
        email: identity.email,
      },
      update: {
        displayName: identity.displayName,
        email: identity.email,
      },
      include: { household: { select: { name: true } } },
    });

    if (member.status === "active") {
      return NextResponse.json(
        { error: "You're already a member", status: member.status },
        { status: 409 },
      );
    }

    if (member.status === "pending") {
      return NextResponse.json({
        ok: true,
        status: "pending",
        householdName: member.household.name,
      });
    }

    return NextResponse.json(
      { error: "Could not join household." },
      { status: 500 },
    );
  } catch (error) {
    console.error("join household failed:", error);
    return NextResponse.json({ error: "Could not join household." }, { status: 500 });
  }
}
