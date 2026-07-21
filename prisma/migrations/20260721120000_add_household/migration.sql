-- Phase 2: Household multi-tenancy.
-- (a) create Household
-- (b) insert "Original" with clerkUserId MIGRATE_ME
-- (c) backfill all rows
-- (d) enforce NOT NULL + FKs
-- ReminderSettings: drop singleton id=1 pattern → one row per household.

-- (a) Household table
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "scanToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Household_clerkUserId_key" ON "Household"("clerkUserId");
CREATE UNIQUE INDEX "Household_scanToken_key" ON "Household"("scanToken");

-- (b) Migration placeholder household (claim via scripts/claim-original-household.sql)
INSERT INTO "Household" ("id", "name", "clerkUserId", "scanToken", "createdAt")
VALUES (
  'hh_original_migrate',
  'Original',
  'MIGRATE_ME',
  'scan_token_original_migrate',
  CURRENT_TIMESTAMP
);

-- (c) Add nullable householdId columns, then backfill
ALTER TABLE "Medication" ADD COLUMN "householdId" TEXT;
ALTER TABLE "ActivityEvent" ADD COLUMN "householdId" TEXT;
ALTER TABLE "UsageLog" ADD COLUMN "householdId" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "householdId" TEXT;
ALTER TABLE "ReminderCallLog" ADD COLUMN "householdId" TEXT;

UPDATE "Medication" SET "householdId" = 'hh_original_migrate' WHERE "householdId" IS NULL;
UPDATE "ActivityEvent" SET "householdId" = 'hh_original_migrate' WHERE "householdId" IS NULL;
UPDATE "UsageLog" SET "householdId" = 'hh_original_migrate' WHERE "householdId" IS NULL;
UPDATE "Prescription" SET "householdId" = 'hh_original_migrate' WHERE "householdId" IS NULL;
UPDATE "ReminderCallLog" SET "householdId" = 'hh_original_migrate' WHERE "householdId" IS NULL;

-- ReminderSettings: rebuild for per-household rows (was singleton id=1)
ALTER TABLE "ReminderSettings" ADD COLUMN "householdId" TEXT;
UPDATE "ReminderSettings" SET "householdId" = 'hh_original_migrate' WHERE "householdId" IS NULL;

-- If no ReminderSettings row existed, create defaults for Original
INSERT INTO "ReminderSettings" (
  "id",
  "householdId",
  "serverAutoCall",
  "callMessageTemplate",
  "quietHoursEnabled",
  "quietStart",
  "quietEnd",
  "callOverdueDuringQuiet"
)
SELECT
  1,
  'hh_original_migrate',
  false,
  'Hello from Pillio. This is a reminder that {brandName} is due at {scheduledTime}. Please check your Pillio calendar when you can. This is a reminder only, not medical advice. Goodbye.',
  false,
  '22:00',
  '07:00',
  true
WHERE NOT EXISTS (SELECT 1 FROM "ReminderSettings");

-- Drop old ReminderSettings PK / allow serial ids going forward
CREATE SEQUENCE IF NOT EXISTS "ReminderSettings_id_seq";
SELECT setval(
  '"ReminderSettings_id_seq"',
  COALESCE((SELECT MAX("id") FROM "ReminderSettings"), 1)
);
ALTER TABLE "ReminderSettings" ALTER COLUMN "id" SET DEFAULT nextval('"ReminderSettings_id_seq"');
ALTER SEQUENCE "ReminderSettings_id_seq" OWNED BY "ReminderSettings"."id";

-- Drop old ReminderCallLog unique (date, medicationId, absoluteIndex)
DROP INDEX IF EXISTS "ReminderCallLog_date_medicationId_absoluteIndex_key";

-- (d) Enforce NOT NULL
ALTER TABLE "Medication" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "ActivityEvent" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "UsageLog" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "Prescription" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "ReminderSettings" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "ReminderCallLog" ALTER COLUMN "householdId" SET NOT NULL;

-- FKs + indexes
CREATE INDEX "Medication_householdId_idx" ON "Medication"("householdId");
CREATE INDEX "ActivityEvent_householdId_idx" ON "ActivityEvent"("householdId");
CREATE INDEX "UsageLog_householdId_idx" ON "UsageLog"("householdId");
CREATE INDEX "Prescription_householdId_idx" ON "Prescription"("householdId");
CREATE INDEX "ReminderCallLog_householdId_idx" ON "ReminderCallLog"("householdId");

CREATE UNIQUE INDEX "ReminderSettings_householdId_key" ON "ReminderSettings"("householdId");
CREATE UNIQUE INDEX "ReminderCallLog_householdId_date_medicationId_absoluteIndex_key"
  ON "ReminderCallLog"("householdId", "date", "medicationId", "absoluteIndex");

ALTER TABLE "Medication"
  ADD CONSTRAINT "Medication_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityEvent"
  ADD CONSTRAINT "ActivityEvent_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UsageLog"
  ADD CONSTRAINT "UsageLog_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Prescription"
  ADD CONSTRAINT "Prescription_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReminderSettings"
  ADD CONSTRAINT "ReminderSettings_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReminderCallLog"
  ADD CONSTRAINT "ReminderCallLog_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
