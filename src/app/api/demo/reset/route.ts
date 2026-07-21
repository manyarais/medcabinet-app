// POST /api/demo/reset — one-button reset to the demo starting state: wipe
// everything so the cabinet starts EMPTY (all strips red) and the first live
// scan lands in compartment 1.

import { logActivity } from "@/lib/activity";
import { resetAllLights } from "@/lib/cabinetBoard";
import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/household";
import { NextResponse } from "next/server";

/* Sample data kept in case a preloaded demo is ever wanted again — currently
   unused: the demo starts with an EMPTY cabinet per the user's preference.
const DEMO_MEDICATIONS = [
  {
    brandName: "Tylenol",
    genericName: "acetaminophen",
    productType: "OTC",
    indications:
      "Temporarily relieves minor aches and pains due to headache, backache, toothache, muscular aches. Temporarily reduces fever.",
    purpose: "Pain reliever / fever reducer",
    dosage: "Take 2 tablets every 6 hours while symptoms last.",
    expirationDate: "2027-06",
    compartment: 1,
  },
  {
    brandName: "Advil",
    genericName: "ibuprofen",
    productType: "OTC",
    indications:
      "Temporarily relieves minor aches and pains due to headache, toothache, backache, menstrual cramps. Temporarily reduces fever.",
    purpose: "Pain reliever / fever reducer",
    dosage: "Take 1 tablet every 4 to 6 hours while symptoms persist.",
    expirationDate: "2027-03",
    compartment: 2,
  },
  {
    brandName: "Claritin",
    genericName: "loratadine",
    productType: "OTC",
    indications:
      "Temporarily relieves runny nose, sneezing, itchy watery eyes due to hay fever or other upper respiratory allergies.",
    purpose: "Antihistamine",
    dosage: "1 tablet daily; not more than 1 tablet in 24 hours.",
    expirationDate: "2026-08",
    compartment: 3,
  },
  {
    brandName: "Amoxicillin",
    genericName: "amoxicillin",
    productType: "PRESCRIPTION",
    indications:
      "Treatment of infections due to susceptible strains of designated microorganisms.",
    purpose: "Antibiotic",
    dosage: "As directed by your physician: 500 mg every 8 hours.",
    expirationDate: "2026-09",
    compartment: 4,
    personName: "Marina Balzac",
  },
];
*/

export async function POST() {
  const { household } = await requireCapability("manageSettings");
  await prisma.reminderCallLog.deleteMany({ where: { householdId: household.id } });
  await prisma.usageLog.deleteMany({ where: { householdId: household.id } });
  await prisma.prescription.deleteMany({ where: { householdId: household.id } });
  await prisma.activityEvent.deleteMany({ where: { householdId: household.id } });
  await prisma.medication.deleteMany({ where: { householdId: household.id } });
  void resetAllLights();

  void logActivity(household.id, "demo_reset", { detail: "wiped to empty cabinet" });
  return NextResponse.json({ ok: true, medications: 0 });
}
