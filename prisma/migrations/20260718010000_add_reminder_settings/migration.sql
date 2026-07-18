-- CreateTable
CREATE TABLE "ReminderSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "serverAutoCall" BOOLEAN NOT NULL DEFAULT false,
    "callMessageTemplate" TEXT NOT NULL DEFAULT 'Hello from Pillio. This is a reminder that {brandName} is due at {scheduledTime}. Please check your Pillio calendar when you can. This is a reminder only, not medical advice. Goodbye.',
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietStart" TEXT NOT NULL DEFAULT '22:00',
    "quietEnd" TEXT NOT NULL DEFAULT '07:00',
    "callOverdueDuringQuiet" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ReminderCallLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "medicationId" INTEGER NOT NULL,
    "absoluteIndex" INTEGER NOT NULL,
    "callSid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderCallLog_date_medicationId_absoluteIndex_key" ON "ReminderCallLog"("date", "medicationId", "absoluteIndex");
