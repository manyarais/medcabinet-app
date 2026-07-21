// GET /api/households/members — list members (owner), using snapshotted identity.

import { memberDisplayLabel } from "@/lib/clerkUsers";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/household";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { household, membership: self } = await requireCapability("manageMembers");
    const members = await prisma.householdMember.findMany({
      where: { householdId: household.id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });

    const activeOwners = members.filter(
      (m) => m.status === "active" && m.role === "owner",
    ).length;

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        clerkUserId: m.clerkUserId,
        displayName: memberDisplayLabel(m),
        email: m.email,
        role: m.role,
        status: m.status,
        canSeeSymptomHistory: m.canSeeSymptomHistory,
        isSelf: m.id === self.id,
        isLastOwner:
          m.role === "owner" && m.status === "active" && activeOwners <= 1,
      })),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Could not list members." }, { status: 500 });
  }
}
