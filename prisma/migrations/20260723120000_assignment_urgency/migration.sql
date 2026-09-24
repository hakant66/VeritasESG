-- AlterTable
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "urgency" TEXT NOT NULL DEFAULT 'normal';
