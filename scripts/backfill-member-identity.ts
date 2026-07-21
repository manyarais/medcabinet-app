/**
 * Backfill HouseholdMember.displayName / email from Clerk Backend API.
 *
 *   npx tsx scripts/backfill-member-identity.ts
 */
import "dotenv/config";
import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required.");
  }
  const clerk = createClerkClient({ secretKey });

  const members = await prisma.householdMember.findMany({
    orderBy: { createdAt: "asc" },
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const member of members) {
    try {
      const user = await clerk.users.getUser(member.clerkUserId);
      const email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        null;
      const displayName =
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        user.username ||
        null;
      if (!displayName && !email) {
        skipped += 1;
        continue;
      }
      await prisma.householdMember.update({
        where: { id: member.id },
        data: { displayName, email },
      });
      updated += 1;
      console.log(`updated ${member.id} → ${displayName ?? email}`);
    } catch (err) {
      failed += 1;
      console.warn(`skip ${member.clerkUserId}:`, err);
    }
  }

  console.log(`done. updated=${updated} skipped=${skipped} failed=${failed}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
