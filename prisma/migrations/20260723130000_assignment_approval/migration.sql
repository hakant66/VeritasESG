-- AlterTable: assignment-level approval workflow
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "approverId" TEXT;
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "approverType" TEXT;
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "submittedForApprovalAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "assignments_approverId_idx" ON "assignments"("approverId");
