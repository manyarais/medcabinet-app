-- Add cabinet occupancy metadata.
ALTER TABLE "Medication" ADD COLUMN "compartmentSize" TEXT;
ALTER TABLE "Medication" ADD COLUMN "outOfCabinet" BOOLEAN NOT NULL DEFAULT false;

-- Usage history is preserved if a medication is permanently removed.
CREATE TABLE "UsageLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "medicationId" INTEGER,
    "symptom" TEXT,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageLog_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
