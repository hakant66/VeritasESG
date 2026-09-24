-- AlterTable
ALTER TABLE "materialitysurveys" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "materialitysurveys_isTemplate_idx" ON "materialitysurveys"("isTemplate");
