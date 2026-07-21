-- Caregiver sharing: members + invite codes.
-- Backfill: one active owner member per existing household.

CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "canSeeSymptomHistory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HouseholdInvite" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdByClerkUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseholdInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HouseholdMember_householdId_clerkUserId_key"
  ON "HouseholdMember"("householdId", "clerkUserId");
CREATE INDEX "HouseholdMember_clerkUserId_idx" ON "HouseholdMember"("clerkUserId");
CREATE INDEX "HouseholdMember_householdId_idx" ON "HouseholdMember"("householdId");

CREATE UNIQUE INDEX "HouseholdInvite_code_key" ON "HouseholdInvite"("code");
CREATE INDEX "HouseholdInvite_householdId_idx" ON "HouseholdInvite"("householdId");

ALTER TABLE "HouseholdMember"
  ADD CONSTRAINT "HouseholdMember_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HouseholdInvite"
  ADD CONSTRAINT "HouseholdInvite_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing households → active owner members
INSERT INTO "HouseholdMember" (
  "id",
  "householdId",
  "clerkUserId",
  "role",
  "status",
  "canSeeSymptomHistory",
  "createdAt"
)
SELECT
  'hm_owner_' || h."id",
  h."id",
  h."clerkUserId",
  'owner',
  'active',
  true,
  CURRENT_TIMESTAMP
FROM "Household" h
WHERE NOT EXISTS (
  SELECT 1 FROM "HouseholdMember" m
  WHERE m."householdId" = h."id" AND m."clerkUserId" = h."clerkUserId"
);
