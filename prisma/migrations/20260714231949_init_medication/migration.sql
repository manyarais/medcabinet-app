-- CreateTable
CREATE TABLE "Medication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brandName" TEXT NOT NULL,
    "genericName" TEXT,
    "productType" TEXT NOT NULL,
    "indications" TEXT NOT NULL,
    "purpose" TEXT,
    "warnings" TEXT,
    "dosage" TEXT,
    "expirationDate" TEXT,
    "compartment" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawLabelText" TEXT
);
