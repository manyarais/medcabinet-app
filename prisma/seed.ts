// Seeds the local SQLite cabinet with 5–6 realistic medications
// so teammates and demos start with a populated cabinet (not empty).
// Includes at least one PRESCRIPTION so the OTC/Rx badge can show both states.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const medications = [
  {
    brandName: "Tylenol",
    genericName: "acetaminophen",
    productType: "OTC",
    indications:
      "Temporarily relieves minor aches and pains due to: the common cold, headache, backache, minor pain of arthritis, toothache, muscular aches, premenstrual and menstrual cramps. Temporarily reduces fever.",
    purpose: "Pain reliever / fever reducer",
    warnings:
      "Liver warning: This product contains acetaminophen. Severe liver damage may occur if you take more than 4,000 mg of acetaminophen in 24 hours.",
    dosage:
      "Take 2 tablets (650 mg) every 6 hours while symptoms last. Do not take more than 6 tablets in 24 hours.",
    expirationDate: "2027-06",
    compartment: 1,
    status: "active",
  },
  {
    brandName: "Advil",
    genericName: "ibuprofen",
    productType: "OTC",
    indications:
      "Temporarily relieves minor aches and pains due to: headache, toothache, backache, menstrual cramps, the common cold, muscular aches, minor pain of arthritis. Temporarily reduces fever.",
    purpose: "Pain reliever / fever reducer",
    warnings:
      "Allergy alert: Ibuprofen may cause a severe allergic reaction. Stomach bleeding warning: This product contains an NSAID, which may cause severe stomach bleeding.",
    dosage:
      "Take 1 tablet every 4 to 6 hours while symptoms persist. If pain or fever does not respond, 2 tablets may be used. Do not exceed 6 tablets in 24 hours.",
    expirationDate: "2027-03",
    compartment: 2,
    status: "active",
  },
  {
    brandName: "Claritin",
    genericName: "loratadine",
    productType: "OTC",
    indications:
      "Temporarily relieves these symptoms due to hay fever or other upper respiratory allergies: runny nose, sneezing, itchy, watery eyes, itching of the nose or throat.",
    purpose: "Antihistamine",
    warnings:
      "Do not use if you have ever had an allergic reaction to this product or any of its ingredients.",
    dosage:
      "Adults and children 6 years and over: 1 tablet daily. Do not take more than 1 tablet in 24 hours.",
    expirationDate: "2026-12",
    compartment: 3,
    status: "active",
  },
  {
    brandName: "Tums",
    genericName: "calcium carbonate",
    productType: "OTC",
    indications:
      "Relieves: heartburn, acid indigestion, sour stomach, upset stomach associated with these symptoms.",
    purpose: "Antacid",
    warnings:
      "Ask a doctor or pharmacist before use if you are taking a prescription drug. Antacids may interact with certain prescription drugs.",
    dosage:
      "Chew 2-4 tablets as symptoms occur. Do not take more than 10 tablets in a 24-hour period.",
    expirationDate: "2028-01",
    compartment: 4,
    status: "active",
  },
  {
    brandName: "Amoxicillin",
    genericName: "amoxicillin",
    productType: "PRESCRIPTION",
    indications:
      "Amoxicillin is indicated in the treatment of infections due to susceptible strains of designated microorganisms.",
    purpose: "Antibiotic",
    warnings:
      "Serious and occasionally fatal hypersensitivity (anaphylactic) reactions have been reported in patients on penicillin therapy.",
    dosage:
      "As directed by your physician. Typical adult dose: 250–500 mg every 8 hours.",
    expirationDate: "2026-09",
    compartment: 5,
    status: "active",
  },
  {
    brandName: "Pepto-Bismol",
    genericName: "bismuth subsalicylate",
    productType: "OTC",
    indications:
      "Relieves: travelers' diarrhea, diarrhea, upset stomach due to overindulgence in food and drink, including: heartburn, indigestion, nausea, gas, belching, fullness.",
    purpose: "Upset stomach reliever / antidiarrheal",
    warnings:
      "Reye's syndrome: Children and teenagers who have or are recovering from chicken pox or flu-like symptoms should not use this product.",
    dosage:
      "Chew or dissolve in mouth: 2 tablets every 1/2 to 1 hour as needed. Do not exceed 8 doses (16 tablets) in 24 hours.",
    expirationDate: "2027-08",
    compartment: 6,
    status: "active",
  },
];

async function main() {
  // Clear existing rows so re-seeding is idempotent for local demos.
  await prisma.medication.deleteMany();

  for (const medication of medications) {
    await prisma.medication.create({ data: medication });
  }

  console.log(`Seeded ${medications.length} medications into the cabinet.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
