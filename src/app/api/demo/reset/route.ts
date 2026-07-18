// POST /api/demo/reset — one-button reset to a clean demo state: wipes all
// data and loads 4 realistic medications into compartments 1–4, leaving 5–8
// free so a live scan lands in compartment 5 during the demo.

import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { sizeForCompartment } from "@/lib/compartments";
import { NextResponse } from "next/server";

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

export async function POST() {
  await prisma.reminderCallLog.deleteMany();
  await prisma.usageLog.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.medication.deleteMany();

  for (const med of DEMO_MEDICATIONS) {
    await prisma.medication.create({
      data: {
        ...med,
        compartmentSize: sizeForCompartment(med.compartment),
        status: "active",
      },
    });
  }

  // One active prescription so /calendar has content during the demo.
  const amoxicillin = await prisma.medication.findFirst({
    where: { brandName: "Amoxicillin" },
  });
  if (amoxicillin) {
    const today = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const end = new Date(today);
    end.setDate(end.getDate() + 9);
    await prisma.prescription.create({
      data: {
        medicationId: amoxicillin.id,
        dosesPerDay: 3,
        pillsPerDose: 1,
        doseTimes: JSON.stringify(["08:00", "14:00", "20:00"]),
        startDate: fmt(today),
        endDate: fmt(end),
      },
    });
  }

  void logActivity("demo_reset", { detail: `${DEMO_MEDICATIONS.length} demo medications loaded` });
  return NextResponse.json({ ok: true, medications: DEMO_MEDICATIONS.length });
}
