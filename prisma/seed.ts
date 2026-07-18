// Seeds 12 realistic medications across both cabinet modules, plus at least one
// active prescription schedule covering today so /calendar has content.

import { PrismaClient } from "@prisma/client";
import { sizeForCompartment } from "../src/lib/compartments";
import { addDaysLocal, formatDateLocal } from "../src/lib/dates";
import { serializeDoseTimes } from "../src/lib/doseTimes";

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
    brandName: "Aleve",
    genericName: "naproxen sodium",
    productType: "OTC",
    indications:
      "Temporarily relieves minor aches and pains due to: backache, headache, menstrual cramps, muscular aches, toothache, the common cold. Temporarily reduces fever.",
    purpose: "Pain reliever / fever reducer",
    warnings:
      "Stomach bleeding warning: This product contains an NSAID, which may cause severe stomach bleeding.",
    dosage: "Take 1 caplet every 8 to 12 hours while symptoms last. Do not exceed 2 caplets in 24 hours.",
    expirationDate: "2027-11",
    compartment: 3,
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
    compartment: 4,
    status: "active",
  },
  {
    brandName: "Zyrtec",
    genericName: "cetirizine hydrochloride",
    productType: "OTC",
    indications:
      "Temporarily relieves these symptoms due to hay fever or other upper respiratory allergies: runny nose, sneezing, itchy, watery eyes, itching of the nose or throat.",
    purpose: "Antihistamine",
    warnings: "Ask a doctor before use if you have liver or kidney disease.",
    dosage: "Adults and children 6 years and over: 1 tablet once daily; do not take more than 1 tablet in 24 hours.",
    expirationDate: "2027-04",
    compartment: 5,
    status: "active",
  },
  {
    brandName: "Benadryl",
    genericName: "diphenhydramine HCl",
    productType: "OTC",
    indications:
      "Temporarily relieves these symptoms due to hay fever or other upper respiratory allergies: runny nose, sneezing, itchy, watery eyes, itching of the nose or throat. Temporarily relieves cough due to minor throat and bronchial irritation.",
    purpose: "Antihistamine / cough suppressant",
    warnings: "May cause marked drowsiness. Avoid alcoholic drinks.",
    dosage: "Take 1 to 2 tablets every 4 to 6 hours. Do not take more than 6 doses in 24 hours.",
    expirationDate: "2027-01",
    compartment: 6,
    status: "active",
  },
  {
    brandName: "Mucinex",
    genericName: "guaifenesin",
    productType: "OTC",
    indications:
      "Helps loosen phlegm (mucus) and thin bronchial secretions to make coughs more productive.",
    purpose: "Expectorant",
    warnings: "Ask a doctor before use if you have a persistent or chronic cough such as occurs with smoking, asthma, chronic bronchitis, or emphysema.",
    dosage: "Adults and children 12 years and over: 1 or 2 tablets every 12 hours. Do not exceed 4 tablets in 24 hours.",
    expirationDate: "2027-09",
    compartment: 7,
    status: "active",
  },
  {
    brandName: "DayQuil",
    genericName: "acetaminophen, dextromethorphan, phenylephrine",
    productType: "OTC",
    indications:
      "Temporarily relieves common cold/flu symptoms: cough, nasal congestion, headache, sore throat, minor aches and pains, fever.",
    purpose: "Multi-symptom cold / flu relief",
    warnings:
      "Liver warning: This product contains acetaminophen. Do not use with any other drug containing acetaminophen.",
    dosage: "Take 2 LiquiCaps with water every 4 hours. Do not exceed 6 doses in 24 hours.",
    expirationDate: "2027-02",
    compartment: 8,
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
    compartment: 9,
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
    compartment: 11,
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
    compartment: 13,
    status: "active",
  },
  {
    brandName: "Lisinopril",
    genericName: "lisinopril",
    productType: "PRESCRIPTION",
    indications:
      "Lisinopril is indicated for the treatment of hypertension in adult patients and pediatric patients 6 years of age and older.",
    purpose: "ACE inhibitor",
    warnings:
      "When pregnancy is detected, discontinue lisinopril as soon as possible. Drugs that act directly on the renin-angiotensin system can cause injury and death to the developing fetus.",
    dosage: "As directed by your physician. Typical adult dose: 10 mg once daily.",
    expirationDate: "2027-05",
    compartment: 15,
    status: "active",
  },
];

async function main() {
  await prisma.usageLog.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medication.deleteMany();

  const created = [];
  for (const medication of medications) {
    const row = await prisma.medication.create({
      data: {
        ...medication,
        compartmentSize: sizeForCompartment(medication.compartment),
      },
    });
    created.push(row);
  }

  const today = formatDateLocal(new Date());
  const amoxicillin = created.find((m) => m.brandName === "Amoxicillin");
  const lisinopril = created.find((m) => m.brandName === "Lisinopril");

  if (amoxicillin) {
    await prisma.prescription.create({
      data: {
        medicationId: amoxicillin.id,
        dosesPerDay: 3,
        pillsPerDose: 1,
        doseTimes: serializeDoseTimes(["08:00", "14:00", "20:00"]),
        startDate: addDaysLocal(today, -1),
        endDate: addDaysLocal(today, 9),
      },
    });
  }

  if (lisinopril) {
    await prisma.prescription.create({
      data: {
        medicationId: lisinopril.id,
        dosesPerDay: 1,
        pillsPerDose: 1,
        doseTimes: serializeDoseTimes(["09:00"]),
        startDate: addDaysLocal(today, -14),
        endDate: addDaysLocal(today, 16),
      },
    });
  }

  console.log(
    `Seeded ${created.length} medications and ${[amoxicillin, lisinopril].filter(Boolean).length} active prescription schedules.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
