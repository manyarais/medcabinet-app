// POST /api/ai/size — estimate a medication's package size from its scan
// photos (turntable-calibrated) and recommend the best free compartment.
// Body: { medicationId, packageType? } — packageType is the user's manual
// override ("this is a small bottle"), stored as confirmed.

import { estimateAndRecommend, recommendFromUserType } from "@/lib/ai/sizeEstimate";
import type { PackageType } from "@/lib/ai/compartmentFit";
import { NextRequest, NextResponse } from "next/server";

const USER_TYPES: PackageType[] = [
  "SMALL_CYLINDRICAL_BOTTLE",
  "STANDARD_CYLINDRICAL_BOTTLE",
  "LARGE_CYLINDRICAL_BOTTLE",
  "RECTANGULAR_BOX",
  "LIQUID_BOTTLE",
  "TUBE",
  "UNKNOWN",
];

export async function POST(request: NextRequest) {
  let body: { medicationId?: number; packageType?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const id = Number(body.medicationId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid medication id." }, { status: 400 });
  }

  try {
    if (body.packageType) {
      const type = body.packageType as PackageType;
      if (!USER_TYPES.includes(type)) {
        return NextResponse.json({ error: "Unknown package type." }, { status: 400 });
      }
      return NextResponse.json({ estimate: await recommendFromUserType(id, type) });
    }
    return NextResponse.json({ estimate: await estimateAndRecommend(id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Size estimation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
