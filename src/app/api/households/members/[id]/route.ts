// PATCH / DELETE /api/households/members/[id]

import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/household";
import { isMemberRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function countOwners(householdId: string) {
  return prisma.householdMember.count({
    where: { householdId, role: "owner", status: "active" },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { household } = await requireCapability("manageMembers");
    const { id } = await params;
    const body = (await request.json()) as {
      role?: string;
      canSeeSymptomHistory?: boolean;
    };

    const member = await prisma.householdMember.findFirst({
      where: { id, householdId: household.id },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const data: { role?: string; canSeeSymptomHistory?: boolean } = {};
    if (typeof body.canSeeSymptomHistory === "boolean") {
      data.canSeeSymptomHistory = body.canSeeSymptomHistory;
    }
    if (body.role != null) {
      const role = body.role.trim();
      if (!isMemberRole(role)) {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }
      if (member.role === "owner" && role !== "owner") {
        const owners = await countOwners(household.id);
        if (owners <= 1) {
          return NextResponse.json(
            { error: "Cannot demote the last owner." },
            { status: 400 },
          );
        }
      }
      data.role = role;
    }

    const updated = await prisma.householdMember.update({
      where: { id: member.id },
      data,
    });
    return NextResponse.json({ member: updated });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Could not update member." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { household, membership } = await requireCapability("manageMembers");
    const { id } = await params;

    const member = await prisma.householdMember.findFirst({
      where: { id, householdId: household.id },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (member.id === membership.id) {
      const owners = await countOwners(household.id);
      if (member.role === "owner" && owners <= 1) {
        return NextResponse.json(
          { error: "You can't remove yourself as the last owner." },
          { status: 400 },
        );
      }
    } else if (member.role === "owner") {
      const owners = await countOwners(household.id);
      if (owners <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last owner." },
          { status: 400 },
        );
      }
    }

    await prisma.householdMember.delete({ where: { id: member.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Could not remove member." }, { status: 500 });
  }
}
