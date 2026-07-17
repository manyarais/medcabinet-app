-- Timed dose slots for each prescription schedule (JSON array of "HH:MM").
ALTER TABLE "Prescription" ADD COLUMN "doseTimes" TEXT NOT NULL DEFAULT '[]';
