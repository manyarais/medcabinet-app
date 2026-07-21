/**
 * One-off: claim the migrated "Original" household for your Clerk user.
 *
 * Usage (from repo root, with DATABASE_URL in .env):
 *   npx tsx scripts/claim-original-household.ts user_YOUR_CLERK_ID
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const clerkUserId = process.argv[2]?.trim();
if (!clerkUserId || !clerkUserId.startsWith("user_")) {
  console.error(
    "Usage: npx tsx scripts/claim-original-household.ts user_XXXXXXXX",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.household.findUnique({
    where: { clerkUserId },
  });
  if (existing) {
    console.error(
      `Clerk user ${clerkUserId} already owns household ${existing.id} (${existing.name}).`,
    );
    process.exit(1);
  }

  const updated = await prisma.household.update({
    where: { clerkUserId: "MIGRATE_ME" },
    data: { clerkUserId },
  });

  console.log(
    `Claimed household "${updated.name}" (${updated.id}). scanToken=${updated.scanToken}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
