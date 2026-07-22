-- Per-household voice reminder destination number.
ALTER TABLE "ReminderSettings" ADD COLUMN IF NOT EXISTS "reminderPhone" TEXT;
