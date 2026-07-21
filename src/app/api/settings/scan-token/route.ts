// GET  /api/settings/scan-token — current household scan token for ESP32 / camera clients.
// POST /api/settings/scan-token — regenerate (invalidates the previous token).

import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/household";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

/** cuid-like unique token (matches Household.scanToken @default(cuid()) spirit). */
function newScanToken(): string {
  return `c${randomBytes(12).toString("hex")}`;
}

export async function GET() {
  const { household } = await requireCapability("manageSettings");
  return NextResponse.json({ scanToken: household.scanToken });
}

export async function POST() {
  const { household } = await requireCapability("manageSettings");
  const updated = await prisma.household.update({
    where: { id: household.id },
    data: { scanToken: newScanToken() },
    select: { scanToken: true },
  });
  return NextResponse.json({ scanToken: updated.scanToken });
}
