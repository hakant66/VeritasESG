-- AlterTable
ALTER TABLE "grimaterialitymatricesrow" ADD COLUMN     "isUniversalDisclosure" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "materialitysurveys" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subeId" TEXT,
    "title" TEXT NOT NULL,
    "standardRef" TEXT NOT NULL DEFAULT 'ESRS',
    "year" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "deadline" TIMESTAMP(3),
    "scaleMax" INTEGER NOT NULL DEFAULT 5,
    "topicRollup" TEXT NOT NULL DEFAULT 'max',
    "materialThreshold" DOUBLE PRECISION,
    "reminderCadence" JSONB NOT NULL DEFAULT '[3, 7]',
    "reminderCutoffDays" INTEGER NOT NULL DEFAULT 14,
    "maxReminders" INTEGER NOT NULL DEFAULT 3,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialitysurveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materialityiros" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "topicRef" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "iroType" TEXT NOT NULL DEFAULT 'impact',
    "valueChainPosition" TEXT NOT NULL DEFAULT 'own_operations',
    "polarity" TEXT NOT NULL DEFAULT 'negative',
    "sasbRef" TEXT,
    "esrsRef" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialityiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materialitystakeholdergroups" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialitystakeholdergroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materialitystakeholders" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "inviteToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "invitedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialitystakeholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materialitysurveyresponses" (
    "id" TEXT NOT NULL,
    "iroId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "financialMaterialityScore" INTEGER NOT NULL DEFAULT 0,
    "impactSeverityScore" INTEGER NOT NULL DEFAULT 0,
    "impactScopeScore" INTEGER NOT NULL DEFAULT 0,
    "impactProbabilityScore" INTEGER NOT NULL DEFAULT 0,
    "irremediabilityScore" INTEGER,
    "freeTextComment" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "legacyFirebaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialitysurveyresponses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materialitysurveyreminderlogs" (
    "id" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "reminderNumber" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialitysurveyreminderlogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "materialitysurveys_customerId_idx" ON "materialitysurveys"("customerId");

-- CreateIndex
CREATE INDEX "materialitysurveys_customerId_status_idx" ON "materialitysurveys"("customerId", "status");

-- CreateIndex
CREATE INDEX "materialitysurveys_legacyFirebaseId_idx" ON "materialitysurveys"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "materialityiros_surveyId_idx" ON "materialityiros"("surveyId");

-- CreateIndex
CREATE INDEX "materialityiros_surveyId_topicRef_idx" ON "materialityiros"("surveyId", "topicRef");

-- CreateIndex
CREATE INDEX "materialityiros_legacyFirebaseId_idx" ON "materialityiros"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "materialitystakeholdergroups_surveyId_idx" ON "materialitystakeholdergroups"("surveyId");

-- CreateIndex
CREATE INDEX "materialitystakeholdergroups_legacyFirebaseId_idx" ON "materialitystakeholdergroups"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "materialitystakeholders_inviteToken_key" ON "materialitystakeholders"("inviteToken");

-- CreateIndex
CREATE INDEX "materialitystakeholders_groupId_idx" ON "materialitystakeholders"("groupId");

-- CreateIndex
CREATE INDEX "materialitystakeholders_status_idx" ON "materialitystakeholders"("status");

-- CreateIndex
CREATE INDEX "materialitystakeholders_legacyFirebaseId_idx" ON "materialitystakeholders"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "materialitysurveyresponses_iroId_idx" ON "materialitysurveyresponses"("iroId");

-- CreateIndex
CREATE INDEX "materialitysurveyresponses_stakeholderId_idx" ON "materialitysurveyresponses"("stakeholderId");

-- CreateIndex
CREATE UNIQUE INDEX "materialitysurveyresponses_iroId_stakeholderId_key" ON "materialitysurveyresponses"("iroId", "stakeholderId");

-- CreateIndex
CREATE INDEX "materialitysurveyreminderlogs_stakeholderId_idx" ON "materialitysurveyreminderlogs"("stakeholderId");

-- CreateIndex
CREATE UNIQUE INDEX "materialitysurveyreminderlogs_stakeholderId_reminderNumber_key" ON "materialitysurveyreminderlogs"("stakeholderId", "reminderNumber");

