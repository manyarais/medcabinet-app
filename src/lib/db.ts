// Singleton Prisma client for the app.
// Next.js hot-reload can create many clients in dev without this guard,
// which exhausts database connections.
// bump: recreate client after schema changes (ReminderSettings / CallLog)

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

const SCHEMA_VERSION = 3; // 3: AI layer (ScanSession / AiAudit / CaregiverSummary + Medication AI fields)

function createClient() {
  return new PrismaClient();
}

if (
  !globalForPrisma.prisma ||
  globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION
) {
  void globalForPrisma.prisma?.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = createClient();
  globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}

export const prisma = globalForPrisma.prisma;
