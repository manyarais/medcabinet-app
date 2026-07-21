// POST /api/households/members/[id]/approve — { role }

import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/household";
import { isMemberRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { household } = await requireCapability("manageMembers");
    const { id } = await params;
    const body = (await request.json()) as { role?: string };
    const role = body.role?.trim();
    if (!role || !isMemberRole(role) || role === "owner") {
      return NextResponse.json(
        { error: "role must be caregiver or viewer." },
        { status: 400 },
      );
    }

    const member = await prisma.householdMember.findFirst({
      where: { id, householdId: household.id, status: "pending" },
    });
    if (!member) {
      return NextResponse.json({ error: "Pending member not found." }, { status: 404 });
    }

    const updated = await prisma.householdMember.update({
      where: { id: member.id },
      data: { status: "active", role },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Could not approve member." }, { status: 500 });
  }
}
