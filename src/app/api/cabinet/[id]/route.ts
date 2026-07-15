// PATCH /api/cabinet/[id] — edit a stored medication (name, expiration, compartment, dosage, …).
// DELETE /api/cabinet/[id] — remove from cabinet.

import {
  getOccupiedCompartments,
  validateAssignableCompartment,
} from "@/lib/cabinet";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

type PatchBody = {
  brandName?: string;
  genericName?: string | null;
  expirationDate?: string | null;
  compartment?: number;
  dosage?: string | null;
  purpose?: string | null;
  warnings?: string | null;
  indications?: string | null;
  productType?: string;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid medication id." }, { status: 400 });
  }

  const existing = await prisma.medication.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: {
    brandName?: string;
    genericName?: string | null;
    expirationDate?: string | null;
    compartment?: number;
    compartmentSize?: string;
    dosage?: string | null;
    purpose?: string | null;
    warnings?: string | null;
    indications?: string;
    productType?: string;
  } = {};

  if (body.brandName !== undefined) {
    const brandName = body.brandName.trim();
    if (!brandName) {
      return NextResponse.json({ error: "brandName cannot be empty." }, { status: 400 });
    }
    data.brandName = brandName;
  }

  if (body.genericName !== undefined) {
    data.genericName = body.genericName?.trim() || null;
  }

  if (body.expirationDate !== undefined) {
    data.expirationDate = body.expirationDate?.trim() || null;
  }

  if (body.dosage !== undefined) {
    data.dosage = body.dosage?.trim() || null;
  }

  if (body.purpose !== undefined) {
    data.purpose = body.purpose?.trim() || null;
  }

  if (body.warnings !== undefined) {
    data.warnings = body.warnings?.trim() || null;
  }

  if (body.indications !== undefined) {
    data.indications = body.indications?.trim() || "";
  }

  if (body.productType !== undefined) {
    data.productType = body.productType.trim();
  }

  if (body.compartment !== undefined) {
    const compartment = Number(body.compartment);
    if (!Number.isFinite(compartment)) {
      return NextResponse.json({ error: "Invalid compartment." }, { status: 400 });
    }

    // Moving to the same compartment is fine; skip occupancy self-conflict.
    if (compartment !== existing.compartment) {
      const occupied = await getOccupiedCompartments(id);
      const check = validateAssignableCompartment(compartment, occupied);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: check.status });
      }
      data.compartment = compartment;
      data.compartmentSize = check.compartmentSize;
    }
  }

  const medication = await prisma.medication.update({
    where: { id },
    data,
  });

  return NextResponse.json({ medication });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid medication id." }, { status: 400 });
  }

  const existing = await prisma.medication.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  await prisma.medication.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
