-- 1) Dedupe HouseholdMember rows before relying on the unique pair.
-- Keep the oldest active row per (householdId, clerkUserId); otherwise oldest row.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "householdId", "clerkUserId"
      ORDER BY
        CASE WHEN status = 'active' THEN 0 ELSE 1 END,
        "createdAt" ASC,
        id ASC
    ) AS rn
  FROM "HouseholdMember"
)
DELETE FROM "HouseholdMember"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Ensure unique (householdId, clerkUserId) exists (noop if already present).
CREATE UNIQUE INDEX IF NOT EXISTS "HouseholdMember_householdId_clerkUserId_key"
  ON "HouseholdMember"("householdId", "clerkUserId");

-- 3) Snapshotted Clerk identity on members.
ALTER TABLE "HouseholdMember" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "HouseholdMember" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- 4) Shared-calendar dose attribution.
ALTER TABLE "UsageLog" ADD COLUMN IF NOT EXISTS "takenByClerkUserId" TEXT;
CREATE INDEX IF NOT EXISTS "UsageLog_takenByClerkUserId_idx"
  ON "UsageLog"("takenByClerkUserId");
