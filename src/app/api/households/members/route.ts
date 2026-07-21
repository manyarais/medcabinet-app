// GET /api/households/members — list members (owner), with Clerk display names.

import { clerkUserLabels } from "@/lib/clerkUsers";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/household";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { household } = await requireCapability("manageMembers");
    const members = await prisma.householdMember.findMany({
      where: { householdId: household.id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });

    const labels = await clerkUserLabels(members.map((m) => m.clerkUserId));

    return NextResponse.json({
      members: members.map((m) => {
        const label = labels.get(m.clerkUserId);
        return {
          ...m,
          displayName: label?.displayName ?? m.clerkUserId,
          email: label?.email ?? null,
        };
      }),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Could not list members." }, { status: 500 });
  }
}
