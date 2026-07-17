-- CreateTable
CREATE TABLE "Prescription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "medicationId" INTEGER NOT NULL,
    "dosesPerDay" INTEGER NOT NULL,
    "pillsPerDose" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    CONSTRAINT "Prescription_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
