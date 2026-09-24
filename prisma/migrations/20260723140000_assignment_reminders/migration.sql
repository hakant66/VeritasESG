-- AlterTable: automated assignment deadline reminders
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "remindersSent" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "assignments_deadline_status_idx" ON "assignments"("deadline", "status");
