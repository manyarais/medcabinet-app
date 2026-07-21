// POST /api/households/invite — owner generates a 6-digit invite code (48h).

import { prisma } from "@/lib/db";
import { randomInviteCode, requireCapability } from "@/lib/household";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { household, userId } = await requireCapability("manageMembers");

    // Replace unused codes for this household.
    await prisma.householdInvite.deleteMany({
      where: { householdId: household.id },
    });

    let code = randomInviteCode();
    for (let i = 0; i < 8; i++) {
      const clash = await prisma.householdInvite.findUnique({ where: { code } });
      if (!clash) break;
      code = randomInviteCode();
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const invite = await prisma.householdInvite.create({
      data: {
        householdId: household.id,
        code,
        createdByClerkUserId: userId,
        expiresAt,
      },
    });

    return NextResponse.json({
      code: invite.code,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Could not create invite." }, { status: 500 });
  }
}
