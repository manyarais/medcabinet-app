// POST /api/households/join — { code } → pending membership.

import { auth } from "@clerk/nextjs/server";
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

    const existing = await prisma.householdMember.findUnique({
      where: {
        householdId_clerkUserId: {
          householdId: invite.householdId,
          clerkUserId: userId,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.status === "pending"
              ? "Your join request is already pending."
              : "You are already a member of this household.",
          status: existing.status,
        },
        { status: 409 },
      );
    }

    const member = await prisma.householdMember.create({
      data: {
        householdId: invite.householdId,
        clerkUserId: userId,
        role: "viewer",
        status: "pending",
        canSeeSymptomHistory: false,
      },
      include: { household: { select: { name: true } } },
    });

    return NextResponse.json({
      ok: true,
      status: "pending",
      householdName: member.household.name,
    });
  } catch (error) {
    console.error("join household failed:", error);
    return NextResponse.json({ error: "Could not join household." }, { status: 500 });
  }
}
