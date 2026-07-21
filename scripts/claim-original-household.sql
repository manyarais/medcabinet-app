-- Claim the "Original" household after you sign in with Clerk once.
--
-- 1. Sign up / sign in on Pillio.
-- 2. Copy your Clerk user id from the Clerk Dashboard → Users → your user
--    (looks like user_xxxxxxxx), OR from the browser Network tab on any
--    authenticated API call.
-- 3. Replace YOUR_CLERK_USER_ID below and run against Neon:

UPDATE "Household"
SET "clerkUserId" = 'YOUR_CLERK_USER_ID'
WHERE "clerkUserId" = 'MIGRATE_ME';

-- Optional: rename the household
-- UPDATE "Household" SET "name" = 'Namit''s cabinet' WHERE "clerkUserId" = 'YOUR_CLERK_USER_ID';

-- Verify:
-- SELECT "id", "name", "clerkUserId", "scanToken" FROM "Household";
