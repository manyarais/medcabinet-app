-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Medication" (
    "id" SERIAL NOT NULL,
    "brandName" TEXT NOT NULL,
    "genericName" TEXT,
    "productType" TEXT NOT NULL,
    "indications" TEXT NOT NULL,
    "purpose" TEXT,
    "warnings" TEXT,
    "dosage" TEXT,
    "expirationDate" TEXT,
    "compartment" INTEGER,
    "compartmentSize" TEXT,
    "outOfCabinet" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawLabelText" TEXT,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" SERIAL NOT NULL,
    "medicationId" INTEGER,
    "symptom" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" SERIAL NOT NULL,
    "medicationId" INTEGER NOT NULL,
    "dosesPerDay" INTEGER NOT NULL,
    "pillsPerDose" INTEGER NOT NULL,
    "doseTimes" TEXT NOT NULL DEFAULT '[]',
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "serverAutoCall" BOOLEAN NOT NULL DEFAULT false,
    "callMessageTemplate" TEXT NOT NULL DEFAULT 'Hello from Pillio. This is a reminder that {brandName} is due at {scheduledTime}. Please check your Pillio calendar when you can. This is a reminder only, not medical advice. Goodbye.',
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietStart" TEXT NOT NULL DEFAULT '22:00',
    "quietEnd" TEXT NOT NULL DEFAULT '07:00',
    "callOverdueDuringQuiet" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ReminderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderCallLog" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "medicationId" INTEGER NOT NULL,
    "absoluteIndex" INTEGER NOT NULL,
    "callSid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderCallLog_date_medicationId_absoluteIndex_key" ON "ReminderCallLog"("date", "medicationId", "absoluteIndex");

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
