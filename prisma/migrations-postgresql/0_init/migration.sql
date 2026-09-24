-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "segments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'esg',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectorIds" JSONB NOT NULL DEFAULT '[]',
    "address" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "brandPortfolio" TEXT NOT NULL DEFAULT '',
    "sectoralDefinition" TEXT NOT NULL DEFAULT '',
    "naceCode" TEXT NOT NULL DEFAULT '',
    "naceDescription" TEXT NOT NULL DEFAULT '',
    "sasbMacroSector" TEXT NOT NULL DEFAULT '',
    "sasbSubSectorSics" TEXT NOT NULL DEFAULT '',
    "headquartersCountry" TEXT NOT NULL DEFAULT '',
    "operationGeographies" TEXT NOT NULL DEFAULT '',
    "employeeCountTotal" INTEGER,
    "employeeCountBlueCollar" INTEGER,
    "employeeCountWhiteCollar" INTEGER,
    "employeeCountMale" INTEGER,
    "employeeCountFemale" INTEGER,
    "employeeContractBreakdown" TEXT NOT NULL DEFAULT '',
    "taxNumber" TEXT NOT NULL DEFAULT '',
    "reportingCurrency" TEXT NOT NULL DEFAULT '',
    "annualTurnoverMeur" DOUBLE PRECISION,
    "totalAssetsMeur" DOUBLE PRECISION,
    "legalName" TEXT NOT NULL DEFAULT '',
    "employeeCountPermanent" INTEGER,
    "employeeCountTemporary" INTEGER,
    "reportingFrameworkKeys" JSONB NOT NULL DEFAULT '[]',
    "csrdScopeEmployeeCount" INTEGER,
    "csrdScopeTurnoverMeur" DOUBLE PRECISION,
    "csrdScopeAssetsMeur" DOUBLE PRECISION,
    "isPublicInterestEntity" BOOLEAN NOT NULL DEFAULT false,
    "esgSummary" JSONB NOT NULL DEFAULT '{}',
    "materialityFramework" TEXT NOT NULL DEFAULT 'gri',
    "materialityAssessment" JSONB NOT NULL DEFAULT '{}',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templatepages" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "briefText" TEXT NOT NULL DEFAULT '',
    "briefFileUrl" TEXT,
    "pageKind" TEXT NOT NULL DEFAULT 'customer_question_set',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templatepages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "pageId" TEXT,
    "domainIds" JSONB NOT NULL DEFAULT '[]',
    "bolum" TEXT NOT NULL DEFAULT '',
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "soru" TEXT NOT NULL,
    "firmaYaniti" TEXT NOT NULL DEFAULT '',
    "firmaYanitiYil1" TEXT NOT NULL DEFAULT '',
    "firmaYanitiYil2" TEXT NOT NULL DEFAULT '',
    "firmaYanitiYil3" TEXT NOT NULL DEFAULT '',
    "firmaNot" TEXT NOT NULL DEFAULT '',
    "ilgiliBirim" TEXT NOT NULL DEFAULT '',
    "veriDogrulugu" TEXT NOT NULL DEFAULT '',
    "aciklama" TEXT NOT NULL DEFAULT '',
    "aciklamaVideoUrl" TEXT NOT NULL DEFAULT '',
    "ornekYanit" TEXT NOT NULL DEFAULT '',
    "dayanak" TEXT NOT NULL DEFAULT '',
    "onay" TEXT NOT NULL DEFAULT '',
    "raporYeri" TEXT NOT NULL DEFAULT '',
    "reportingItr" TEXT NOT NULL DEFAULT '',
    "tsrs1" TEXT NOT NULL DEFAULT '',
    "tsrs2" TEXT NOT NULL DEFAULT '',
    "sasbRtCh" TEXT NOT NULL DEFAULT '',
    "gri" TEXT NOT NULL DEFAULT '',
    "msci" TEXT NOT NULL DEFAULT '',
    "esrs" TEXT NOT NULL DEFAULT '',
    "kayit" TEXT NOT NULL DEFAULT '',
    "numara" INTEGER,
    "thematicGroup" TEXT NOT NULL DEFAULT '',
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "answerFormat" TEXT NOT NULL DEFAULT 'textarea',
    "soruCogaltma" TEXT NOT NULL DEFAULT 'yok',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projectquestions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceQuestionId" TEXT NOT NULL,
    "sourceTemplateId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "pageId" TEXT,
    "domainIds" JSONB NOT NULL DEFAULT '[]',
    "bolum" TEXT NOT NULL DEFAULT '',
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "soru" TEXT NOT NULL,
    "firmaYaniti" TEXT NOT NULL DEFAULT '',
    "firmaYanitiYil1" TEXT NOT NULL DEFAULT '',
    "firmaYanitiYil2" TEXT NOT NULL DEFAULT '',
    "firmaYanitiYil3" TEXT NOT NULL DEFAULT '',
    "firmaNot" TEXT NOT NULL DEFAULT '',
    "ilgiliBirim" TEXT NOT NULL DEFAULT '',
    "veriDogrulugu" TEXT NOT NULL DEFAULT '',
    "aciklama" TEXT NOT NULL DEFAULT '',
    "aciklamaVideoUrl" TEXT NOT NULL DEFAULT '',
    "ornekYanit" TEXT NOT NULL DEFAULT '',
    "dayanak" TEXT NOT NULL DEFAULT '',
    "onay" TEXT NOT NULL DEFAULT '',
    "raporYeri" TEXT NOT NULL DEFAULT '',
    "reportingItr" TEXT NOT NULL DEFAULT '',
    "tsrs1" TEXT NOT NULL DEFAULT '',
    "tsrs2" TEXT NOT NULL DEFAULT '',
    "sasbRtCh" TEXT NOT NULL DEFAULT '',
    "gri" TEXT NOT NULL DEFAULT '',
    "msci" TEXT NOT NULL DEFAULT '',
    "esrs" TEXT NOT NULL DEFAULT '',
    "kayit" TEXT NOT NULL DEFAULT '',
    "numara" INTEGER,
    "thematicGroup" TEXT NOT NULL DEFAULT '',
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "answerFormat" TEXT NOT NULL DEFAULT 'textarea',
    "soruCogaltma" TEXT NOT NULL DEFAULT 'yok',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projectquestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "domainIds" JSONB NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'Project',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TEXT,
    "endDate" TEXT,
    "progress" INTEGER,
    "helpVideoUrl" TEXT,
    "allowMultipleAssignments" BOOLEAN NOT NULL DEFAULT false,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projectpages" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceTemplatePageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "briefText" TEXT NOT NULL DEFAULT '',
    "briefFileUrl" TEXT,
    "pageKind" TEXT NOT NULL DEFAULT 'customer_question_set',
    "draftContent" TEXT NOT NULL DEFAULT '',
    "draftStatus" TEXT NOT NULL DEFAULT 'pending',
    "answerUpdatedFlag" BOOLEAN NOT NULL DEFAULT false,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projectpages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projectuserassignments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projectuserassignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "questionIds" JSONB NOT NULL DEFAULT '[]',
    "token" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "beginDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "message" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedBy" TEXT,
    "assignedByName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assigneeNoticeSentAt" TIMESTAMP(3),
    "assigneeNoticeSentByUserId" TEXT,
    "assigneeNoticeSentByName" TEXT,
    "assigneeNoticeSummary" TEXT,
    "assigneeNoticeHasNotes" BOOLEAN NOT NULL DEFAULT false,
    "assigneeNoticeHasEvidence" BOOLEAN NOT NULL DEFAULT false,
    "assigneeNoticeItems" JSONB,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "latestAnswer" TEXT NOT NULL DEFAULT '',
    "latestFileUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "answerNotes" JSONB,
    "evidenceName" TEXT,
    "submittedByUserId" TEXT,
    "onBehalfOfUserId" TEXT,
    "workflowStatus" TEXT,
    "workflowStatusLog" JSONB,
    "reviewComments" JSONB,
    "adminReviewStatus" TEXT,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answerversions" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "fileUrl" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL,
    "changeNote" TEXT NOT NULL DEFAULT '',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answerversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentmessages" (
    "id" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentmessages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platformusers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "department" TEXT NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "contactId" TEXT,
    "customerId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'tr',
    "autoShowHelpOnOpen" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "passwordUpdatedAt" TIMESTAMP(3),
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platformusers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otpcodes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otpcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aidrafts" (
    "id" TEXT NOT NULL,
    "projectPageId" TEXT NOT NULL,
    "promptUsed" TEXT NOT NULL,
    "draftContent" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aidrafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditlogs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "projectId" TEXT,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "emailMessageId" TEXT,
    "emailRecipientEmail" TEXT,
    "emailDeliveryStatus" TEXT,
    "emailDeliveryDetail" TEXT,
    "emailDeliveryAt" TIMESTAMP(3),
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledgebases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domainIds" JSONB NOT NULL DEFAULT '[]',
    "domainId" TEXT,
    "projectId" TEXT,
    "customerId" TEXT,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledgebases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kbdocuments" (
    "id" TEXT NOT NULL,
    "kbId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "text" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kbdocuments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kbingestjobs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "kbId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "chunkCount" INTEGER,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kbingestjobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kbchunks" (
    "id" TEXT NOT NULL,
    "kbId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "customerId" TEXT,
    "projectId" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "qdrantPointId" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kbchunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "en" TEXT NOT NULL,
    "tr" TEXT NOT NULL,
    "group" TEXT,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emailsettings" (
    "id" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'smtp',
    "apiKey" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "passwordResetSubject" TEXT NOT NULL,
    "passwordResetBody" TEXT NOT NULL,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emailsettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appsettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appsettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduledjobs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT NOT NULL DEFAULT 'never',
    "lastRunOutput" TEXT NOT NULL DEFAULT '',
    "nextRunAt" TIMESTAMP(3),
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduledjobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emissionfactors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "activityUnit" TEXT NOT NULL,
    "factorValue" DOUBLE PRECISION NOT NULL,
    "factorUnit" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "versionYear" INTEGER NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Global',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "userOverridable" BOOLEAN NOT NULL DEFAULT false,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emissionfactors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emissionentries" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "scope" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "activityValue" DOUBLE PRECISION NOT NULL,
    "activityUnit" TEXT NOT NULL,
    "emissionFactorId" TEXT NOT NULL,
    "factorValue" DOUBLE PRECISION NOT NULL,
    "facilityId" TEXT,
    "facilityName" TEXT NOT NULL DEFAULT '',
    "resultTCO2e" DOUBLE PRECISION NOT NULL,
    "calculationFormula" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emissionentries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emissionintensityinputs" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "revenueMillionTRY" DOUBLE PRECISION,
    "productionTons" DOUBLE PRECISION,
    "employeeCount" DOUBLE PRECISION,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emissionintensityinputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scope2marketdatas" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "certificateMWh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractualFactorKgCO2ePerKWh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scope2marketdatas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricdefinitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "scope" TEXT NOT NULL,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metricdefinitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricentries" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "facilityId" TEXT,
    "facilityName" TEXT NOT NULL DEFAULT '',
    "metricDefinitionId" TEXT NOT NULL,
    "metricDefinitionCode" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "approvalStage" TEXT NOT NULL DEFAULT 'DATA_ENTRY',
    "approvalStatusLog" JSONB NOT NULL DEFAULT '[]',
    "ownerUserId" TEXT,
    "emissionEntryId" TEXT,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metricentries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materialitytopics" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "esrsId" TEXT NOT NULL,
    "financialImpact" INTEGER NOT NULL DEFAULT 1,
    "impactSeverity" INTEGER NOT NULL DEFAULT 1,
    "probability" INTEGER NOT NULL DEFAULT 1,
    "stakeholderConcern" INTEGER NOT NULL DEFAULT 1,
    "isMaterial" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialitytopics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materialityassessments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "materialTopics" JSONB NOT NULL DEFAULT '[]',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialityassessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grimaterialitymatricesrow" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT NOT NULL,
    "griMapping" TEXT NOT NULL,
    "disclosures" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grimaterialitymatricesrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "griassessmentscores" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "griRowId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "financialImpact" INTEGER NOT NULL DEFAULT 0,
    "impactSeverity" INTEGER NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "stakeholderConcern" INTEGER NOT NULL DEFAULT 0,
    "isMaterial" BOOLEAN NOT NULL DEFAULT false,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "griassessmentscores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esrsassessmentscores" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "esrsRowId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "financialImpact" INTEGER NOT NULL DEFAULT 0,
    "impactSeverity" INTEGER NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "stakeholderConcern" INTEGER NOT NULL DEFAULT 0,
    "isMaterial" BOOLEAN NOT NULL DEFAULT false,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "esrsassessmentscores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issbassessmentscores" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "issbRowId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "financialImpact" INTEGER NOT NULL DEFAULT 0,
    "impactSeverity" INTEGER NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "stakeholderConcern" INTEGER NOT NULL DEFAULT 0,
    "isMaterial" BOOLEAN NOT NULL DEFAULT false,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issbassessmentscores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frameworkrequirements" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "frameworkName" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '2023',
    "topicId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "disclosureId" TEXT NOT NULL,
    "disclosureName" TEXT NOT NULL,
    "dataPointKeys" JSONB NOT NULL DEFAULT '[]',
    "alternateDataKeys" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL,
    "guidance" TEXT,
    "materiality" BOOLEAN NOT NULL DEFAULT false,
    "materialityTopic" TEXT,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'high',
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frameworkrequirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complianceruns" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "totalRequirements" INTEGER NOT NULL,
    "answeredRequirements" INTEGER NOT NULL,
    "completionPercentage" DOUBLE PRECISION NOT NULL,
    "gaps" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "criticalGapCount" INTEGER NOT NULL DEFAULT 0,
    "validationStartedAt" TIMESTAMP(3),
    "validationCompletedAt" TIMESTAMP(3),
    "validationDurationMs" INTEGER,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complianceruns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frameworkmappings" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "mappingName" TEXT NOT NULL,
    "equivalenceLevel" TEXT NOT NULL,
    "varianceThresholdPercent" DOUBLE PRECISION NOT NULL,
    "varianceReasonGuide" JSONB NOT NULL DEFAULT '[]',
    "frameworks" JSONB NOT NULL DEFAULT '[]',
    "reconciliationLogic" JSONB NOT NULL DEFAULT '{}',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frameworkmappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consistencyconflicts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "framework1" JSONB NOT NULL,
    "framework2" JSONB NOT NULL,
    "variance" JSONB NOT NULL,
    "likelyCauses" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'unresolved',
    "resolution" JSONB,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consistencyconflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "climatescenarios" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scenarioName" TEXT,
    "scenarioDescription" TEXT,
    "pathwayId" TEXT,
    "pathwayName" TEXT,
    "baselineEmissions" DOUBLE PRECISION,
    "baselineYear" INTEGER,
    "targetYear" INTEGER,
    "targetEmissions" DOUBLE PRECISION,
    "selectedLevers" JSONB NOT NULL DEFAULT '[]',
    "financialImpact" JSONB,
    "riskAssessment" JSONB,
    "sbtAlignment" JSONB,
    "roadmap" JSONB NOT NULL DEFAULT '[]',
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "climatescenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transitionlevertemplates" (
    "id" TEXT NOT NULL,
    "leverId" TEXT NOT NULL,
    "leverName" TEXT,
    "category" TEXT,
    "description" TEXT,
    "applicableIndustries" JSONB NOT NULL DEFAULT '[]',
    "trl" INTEGER,
    "maturity" TEXT,
    "emissionReductionRange" JSONB,
    "capexRange" JSONB,
    "opexRange" JSONB,
    "paybackRange" JSONB,
    "implementationDuration" JSONB,
    "technicalRisk" TEXT,
    "marketRisk" TEXT,
    "regulatoryRisk" TEXT,
    "sbtEligible" BOOLEAN,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transitionlevertemplates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectorcategories" (
    "id" TEXT NOT NULL,
    "questionSetType" TEXT NOT NULL DEFAULT 'sozel',
    "numara" INTEGER,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "soru" TEXT NOT NULL,
    "bolum" TEXT NOT NULL DEFAULT '',
    "firmaYaniti" TEXT NOT NULL DEFAULT '',
    "ilgiliBirim" TEXT NOT NULL DEFAULT '',
    "veriDogrulugu" TEXT NOT NULL DEFAULT '',
    "soruAciklama" TEXT NOT NULL DEFAULT '',
    "ornekYanit" TEXT NOT NULL DEFAULT '',
    "dayanak" TEXT NOT NULL DEFAULT '',
    "onay" TEXT NOT NULL DEFAULT '',
    "tesisBazinda" TEXT NOT NULL DEFAULT '',
    "ekZorunlu" TEXT NOT NULL DEFAULT '',
    "raporYeri" TEXT NOT NULL DEFAULT '',
    "reportingItr" TEXT NOT NULL DEFAULT '',
    "atananSayfa" TEXT,
    "kayit" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sectorcategories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "segments_name_idx" ON "segments"("name");

-- CreateIndex
CREATE INDEX "segments_type_idx" ON "segments"("type");

-- CreateIndex
CREATE INDEX "segments_legacyFirebaseId_idx" ON "segments"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "domains_name_key" ON "domains"("name");

-- CreateIndex
CREATE INDEX "domains_legacyFirebaseId_idx" ON "domains"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_legacyFirebaseId_idx" ON "customers"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "branches_customerId_idx" ON "branches"("customerId");

-- CreateIndex
CREATE INDEX "branches_customerId_name_idx" ON "branches"("customerId", "name");

-- CreateIndex
CREATE INDEX "branches_legacyFirebaseId_idx" ON "branches"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "contacts_customerId_idx" ON "contacts"("customerId");

-- CreateIndex
CREATE INDEX "contacts_branchId_idx" ON "contacts"("branchId");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_customerId_email_idx" ON "contacts"("customerId", "email");

-- CreateIndex
CREATE INDEX "contacts_legacyFirebaseId_idx" ON "contacts"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "templates_sectorId_idx" ON "templates"("sectorId");

-- CreateIndex
CREATE INDEX "templates_sectorId_name_idx" ON "templates"("sectorId", "name");

-- CreateIndex
CREATE INDEX "templates_legacyFirebaseId_idx" ON "templates"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "templatepages_templateId_idx" ON "templatepages"("templateId");

-- CreateIndex
CREATE INDEX "templatepages_templateId_order_idx" ON "templatepages"("templateId", "order");

-- CreateIndex
CREATE INDEX "templatepages_legacyFirebaseId_idx" ON "templatepages"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "questions_templateId_idx" ON "questions"("templateId");

-- CreateIndex
CREATE INDEX "questions_sectorId_idx" ON "questions"("sectorId");

-- CreateIndex
CREATE INDEX "questions_pageId_idx" ON "questions"("pageId");

-- CreateIndex
CREATE INDEX "questions_templateId_pageId_order_idx" ON "questions"("templateId", "pageId", "order");

-- CreateIndex
CREATE INDEX "questions_templateId_thematicGroup_numara_idx" ON "questions"("templateId", "thematicGroup", "numara");

-- CreateIndex
CREATE INDEX "questions_legacyFirebaseId_idx" ON "questions"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "projectquestions_projectId_idx" ON "projectquestions"("projectId");

-- CreateIndex
CREATE INDEX "projectquestions_sourceQuestionId_idx" ON "projectquestions"("sourceQuestionId");

-- CreateIndex
CREATE INDEX "projectquestions_sourceTemplateId_idx" ON "projectquestions"("sourceTemplateId");

-- CreateIndex
CREATE INDEX "projectquestions_sectorId_idx" ON "projectquestions"("sectorId");

-- CreateIndex
CREATE INDEX "projectquestions_pageId_idx" ON "projectquestions"("pageId");

-- CreateIndex
CREATE INDEX "projectquestions_projectId_pageId_order_idx" ON "projectquestions"("projectId", "pageId", "order");

-- CreateIndex
CREATE INDEX "projectquestions_projectId_sourceQuestionId_idx" ON "projectquestions"("projectId", "sourceQuestionId");

-- CreateIndex
CREATE INDEX "projectquestions_legacyFirebaseId_idx" ON "projectquestions"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "projects_customerId_idx" ON "projects"("customerId");

-- CreateIndex
CREATE INDEX "projects_templateId_idx" ON "projects"("templateId");

-- CreateIndex
CREATE INDEX "projects_customerId_status_idx" ON "projects"("customerId", "status");

-- CreateIndex
CREATE INDEX "projects_legacyFirebaseId_idx" ON "projects"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "projectpages_projectId_idx" ON "projectpages"("projectId");

-- CreateIndex
CREATE INDEX "projectpages_sourceTemplatePageId_idx" ON "projectpages"("sourceTemplatePageId");

-- CreateIndex
CREATE INDEX "projectpages_projectId_order_idx" ON "projectpages"("projectId", "order");

-- CreateIndex
CREATE INDEX "projectpages_legacyFirebaseId_idx" ON "projectpages"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "projectuserassignments_projectId_idx" ON "projectuserassignments"("projectId");

-- CreateIndex
CREATE INDEX "projectuserassignments_userId_idx" ON "projectuserassignments"("userId");

-- CreateIndex
CREATE INDEX "projectuserassignments_legacyFirebaseId_idx" ON "projectuserassignments"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "projectuserassignments_projectId_userId_key" ON "projectuserassignments"("projectId", "userId");

-- CreateIndex
CREATE INDEX "assignments_projectId_idx" ON "assignments"("projectId");

-- CreateIndex
CREATE INDEX "assignments_recipientId_idx" ON "assignments"("recipientId");

-- CreateIndex
CREATE INDEX "assignments_token_idx" ON "assignments"("token");

-- CreateIndex
CREATE INDEX "assignments_assignedBy_idx" ON "assignments"("assignedBy");

-- CreateIndex
CREATE INDEX "assignments_projectId_recipientId_idx" ON "assignments"("projectId", "recipientId");

-- CreateIndex
CREATE INDEX "assignments_projectId_status_idx" ON "assignments"("projectId", "status");

-- CreateIndex
CREATE INDEX "assignments_legacyFirebaseId_idx" ON "assignments"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "answers_assignmentId_idx" ON "answers"("assignmentId");

-- CreateIndex
CREATE INDEX "answers_questionId_idx" ON "answers"("questionId");

-- CreateIndex
CREATE INDEX "answers_projectId_idx" ON "answers"("projectId");

-- CreateIndex
CREATE INDEX "answers_contactId_idx" ON "answers"("contactId");

-- CreateIndex
CREATE INDEX "answers_submittedByUserId_idx" ON "answers"("submittedByUserId");

-- CreateIndex
CREATE INDEX "answers_onBehalfOfUserId_idx" ON "answers"("onBehalfOfUserId");

-- CreateIndex
CREATE INDEX "answers_workflowStatus_idx" ON "answers"("workflowStatus");

-- CreateIndex
CREATE INDEX "answers_projectId_assignmentId_questionId_idx" ON "answers"("projectId", "assignmentId", "questionId");

-- CreateIndex
CREATE INDEX "answers_legacyFirebaseId_idx" ON "answers"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "answers_projectId_questionId_contactId_key" ON "answers"("projectId", "questionId", "contactId");

-- CreateIndex
CREATE INDEX "answerversions_answerId_idx" ON "answerversions"("answerId");

-- CreateIndex
CREATE INDEX "answerversions_questionId_idx" ON "answerversions"("questionId");

-- CreateIndex
CREATE INDEX "answerversions_answerId_changedAt_idx" ON "answerversions"("answerId", "changedAt");

-- CreateIndex
CREATE INDEX "answerversions_legacyFirebaseId_idx" ON "answerversions"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "commentmessages_authorId_idx" ON "commentmessages"("authorId");

-- CreateIndex
CREATE INDEX "commentmessages_authorType_authorId_idx" ON "commentmessages"("authorType", "authorId");

-- CreateIndex
CREATE INDEX "commentmessages_legacyFirebaseId_idx" ON "commentmessages"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "platformusers_email_key" ON "platformusers"("email");

-- CreateIndex
CREATE INDEX "platformusers_role_idx" ON "platformusers"("role");

-- CreateIndex
CREATE INDEX "platformusers_contactId_idx" ON "platformusers"("contactId");

-- CreateIndex
CREATE INDEX "platformusers_customerId_idx" ON "platformusers"("customerId");

-- CreateIndex
CREATE INDEX "platformusers_customerId_role_idx" ON "platformusers"("customerId", "role");

-- CreateIndex
CREATE INDEX "platformusers_legacyFirebaseId_idx" ON "platformusers"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "otpcodes_email_key" ON "otpcodes"("email");

-- CreateIndex
CREATE INDEX "otpcodes_email_code_idx" ON "otpcodes"("email", "code");

-- CreateIndex
CREATE INDEX "otpcodes_expiresAt_idx" ON "otpcodes"("expiresAt");

-- CreateIndex
CREATE INDEX "aidrafts_projectPageId_idx" ON "aidrafts"("projectPageId");

-- CreateIndex
CREATE INDEX "aidrafts_approvedBy_idx" ON "aidrafts"("approvedBy");

-- CreateIndex
CREATE INDEX "aidrafts_projectPageId_generatedAt_idx" ON "aidrafts"("projectPageId", "generatedAt");

-- CreateIndex
CREATE INDEX "aidrafts_legacyFirebaseId_idx" ON "aidrafts"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "auditlogs_userId_idx" ON "auditlogs"("userId");

-- CreateIndex
CREATE INDEX "auditlogs_collection_idx" ON "auditlogs"("collection");

-- CreateIndex
CREATE INDEX "auditlogs_recordId_idx" ON "auditlogs"("recordId");

-- CreateIndex
CREATE INDEX "auditlogs_projectId_idx" ON "auditlogs"("projectId");

-- CreateIndex
CREATE INDEX "auditlogs_emailMessageId_idx" ON "auditlogs"("emailMessageId");

-- CreateIndex
CREATE INDEX "auditlogs_emailRecipientEmail_idx" ON "auditlogs"("emailRecipientEmail");

-- CreateIndex
CREATE INDEX "auditlogs_projectId_timestamp_idx" ON "auditlogs"("projectId", "timestamp");

-- CreateIndex
CREATE INDEX "auditlogs_collection_recordId_idx" ON "auditlogs"("collection", "recordId");

-- CreateIndex
CREATE INDEX "auditlogs_collection_emailMessageId_idx" ON "auditlogs"("collection", "emailMessageId");

-- CreateIndex
CREATE INDEX "auditlogs_legacyFirebaseId_idx" ON "auditlogs"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "knowledgebases_domainId_idx" ON "knowledgebases"("domainId");

-- CreateIndex
CREATE INDEX "knowledgebases_projectId_idx" ON "knowledgebases"("projectId");

-- CreateIndex
CREATE INDEX "knowledgebases_customerId_idx" ON "knowledgebases"("customerId");

-- CreateIndex
CREATE INDEX "knowledgebases_legacyFirebaseId_idx" ON "knowledgebases"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "kbdocuments_kbId_idx" ON "kbdocuments"("kbId");

-- CreateIndex
CREATE INDEX "kbdocuments_kbId_createdAt_idx" ON "kbdocuments"("kbId", "createdAt");

-- CreateIndex
CREATE INDEX "kbdocuments_legacyFirebaseId_idx" ON "kbdocuments"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "kbingestjobs_documentId_idx" ON "kbingestjobs"("documentId");

-- CreateIndex
CREATE INDEX "kbingestjobs_kbId_idx" ON "kbingestjobs"("kbId");

-- CreateIndex
CREATE INDEX "kbingestjobs_documentId_createdAt_idx" ON "kbingestjobs"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "kbingestjobs_legacyFirebaseId_idx" ON "kbingestjobs"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "kbchunks_kbId_idx" ON "kbchunks"("kbId");

-- CreateIndex
CREATE INDEX "kbchunks_documentId_idx" ON "kbchunks"("documentId");

-- CreateIndex
CREATE INDEX "kbchunks_customerId_idx" ON "kbchunks"("customerId");

-- CreateIndex
CREATE INDEX "kbchunks_projectId_idx" ON "kbchunks"("projectId");

-- CreateIndex
CREATE INDEX "kbchunks_qdrantPointId_idx" ON "kbchunks"("qdrantPointId");

-- CreateIndex
CREATE INDEX "kbchunks_legacyFirebaseId_idx" ON "kbchunks"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "kbchunks_documentId_chunkIndex_key" ON "kbchunks"("documentId", "chunkIndex");

-- CreateIndex
CREATE UNIQUE INDEX "translations_key_key" ON "translations"("key");

-- CreateIndex
CREATE INDEX "translations_group_idx" ON "translations"("group");

-- CreateIndex
CREATE INDEX "translations_group_key_idx" ON "translations"("group", "key");

-- CreateIndex
CREATE INDEX "translations_legacyFirebaseId_idx" ON "translations"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "emailsettings_legacyFirebaseId_idx" ON "emailsettings"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "appsettings_key_key" ON "appsettings"("key");

-- CreateIndex
CREATE INDEX "appsettings_legacyFirebaseId_idx" ON "appsettings"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "scheduledjobs_legacyFirebaseId_idx" ON "scheduledjobs"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "emissionfactors_name_key" ON "emissionfactors"("name");

-- CreateIndex
CREATE INDEX "emissionfactors_scope_isActive_idx" ON "emissionfactors"("scope", "isActive");

-- CreateIndex
CREATE INDEX "emissionfactors_legacyFirebaseId_idx" ON "emissionfactors"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "emissionentries_customerId_idx" ON "emissionentries"("customerId");

-- CreateIndex
CREATE INDEX "emissionentries_year_idx" ON "emissionentries"("year");

-- CreateIndex
CREATE INDEX "emissionentries_emissionFactorId_idx" ON "emissionentries"("emissionFactorId");

-- CreateIndex
CREATE INDEX "emissionentries_facilityId_idx" ON "emissionentries"("facilityId");

-- CreateIndex
CREATE INDEX "emissionentries_customerId_year_scope_idx" ON "emissionentries"("customerId", "year", "scope");

-- CreateIndex
CREATE INDEX "emissionentries_legacyFirebaseId_idx" ON "emissionentries"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "emissionintensityinputs_customerId_idx" ON "emissionintensityinputs"("customerId");

-- CreateIndex
CREATE INDEX "emissionintensityinputs_legacyFirebaseId_idx" ON "emissionintensityinputs"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "emissionintensityinputs_customerId_year_key" ON "emissionintensityinputs"("customerId", "year");

-- CreateIndex
CREATE INDEX "scope2marketdatas_customerId_idx" ON "scope2marketdatas"("customerId");

-- CreateIndex
CREATE INDEX "scope2marketdatas_legacyFirebaseId_idx" ON "scope2marketdatas"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "scope2marketdatas_customerId_year_key" ON "scope2marketdatas"("customerId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "metricdefinitions_code_key" ON "metricdefinitions"("code");

-- CreateIndex
CREATE INDEX "metricdefinitions_legacyFirebaseId_idx" ON "metricdefinitions"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "metricentries_customerId_idx" ON "metricentries"("customerId");

-- CreateIndex
CREATE INDEX "metricentries_metricDefinitionId_idx" ON "metricentries"("metricDefinitionId");

-- CreateIndex
CREATE INDEX "metricentries_metricDefinitionCode_idx" ON "metricentries"("metricDefinitionCode");

-- CreateIndex
CREATE INDEX "metricentries_facilityId_idx" ON "metricentries"("facilityId");

-- CreateIndex
CREATE INDEX "metricentries_customerId_year_idx" ON "metricentries"("customerId", "year");

-- CreateIndex
CREATE INDEX "metricentries_customerId_year_metricDefinitionCode_facility_idx" ON "metricentries"("customerId", "year", "metricDefinitionCode", "facilityId");

-- CreateIndex
CREATE INDEX "metricentries_legacyFirebaseId_idx" ON "metricentries"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "materialitytopics_customerId_idx" ON "materialitytopics"("customerId");

-- CreateIndex
CREATE INDEX "materialitytopics_legacyFirebaseId_idx" ON "materialitytopics"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "materialitytopics_customerId_year_esrsId_key" ON "materialitytopics"("customerId", "year", "esrsId");

-- CreateIndex
CREATE INDEX "materialityassessments_customerId_idx" ON "materialityassessments"("customerId");

-- CreateIndex
CREATE INDEX "materialityassessments_legacyFirebaseId_idx" ON "materialityassessments"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "materialityassessments_customerId_year_key" ON "materialityassessments"("customerId", "year");

-- CreateIndex
CREATE INDEX "grimaterialitymatricesrow_customerId_idx" ON "grimaterialitymatricesrow"("customerId");

-- CreateIndex
CREATE INDEX "grimaterialitymatricesrow_customerId_order_idx" ON "grimaterialitymatricesrow"("customerId", "order");

-- CreateIndex
CREATE INDEX "grimaterialitymatricesrow_legacyFirebaseId_idx" ON "grimaterialitymatricesrow"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "griassessmentscores_customerId_idx" ON "griassessmentscores"("customerId");

-- CreateIndex
CREATE INDEX "griassessmentscores_year_idx" ON "griassessmentscores"("year");

-- CreateIndex
CREATE INDEX "griassessmentscores_legacyFirebaseId_idx" ON "griassessmentscores"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "griassessmentscores_customerId_year_griRowId_key" ON "griassessmentscores"("customerId", "year", "griRowId");

-- CreateIndex
CREATE INDEX "esrsassessmentscores_customerId_idx" ON "esrsassessmentscores"("customerId");

-- CreateIndex
CREATE INDEX "esrsassessmentscores_year_idx" ON "esrsassessmentscores"("year");

-- CreateIndex
CREATE INDEX "esrsassessmentscores_legacyFirebaseId_idx" ON "esrsassessmentscores"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "esrsassessmentscores_customerId_year_esrsRowId_key" ON "esrsassessmentscores"("customerId", "year", "esrsRowId");

-- CreateIndex
CREATE INDEX "issbassessmentscores_customerId_idx" ON "issbassessmentscores"("customerId");

-- CreateIndex
CREATE INDEX "issbassessmentscores_year_idx" ON "issbassessmentscores"("year");

-- CreateIndex
CREATE INDEX "issbassessmentscores_legacyFirebaseId_idx" ON "issbassessmentscores"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "issbassessmentscores_customerId_year_issbRowId_key" ON "issbassessmentscores"("customerId", "year", "issbRowId");

-- CreateIndex
CREATE UNIQUE INDEX "frameworkrequirements_disclosureId_key" ON "frameworkrequirements"("disclosureId");

-- CreateIndex
CREATE INDEX "frameworkrequirements_frameworkId_idx" ON "frameworkrequirements"("frameworkId");

-- CreateIndex
CREATE INDEX "frameworkrequirements_topicId_idx" ON "frameworkrequirements"("topicId");

-- CreateIndex
CREATE INDEX "frameworkrequirements_frameworkId_mandatory_idx" ON "frameworkrequirements"("frameworkId", "mandatory");

-- CreateIndex
CREATE INDEX "frameworkrequirements_legacyFirebaseId_idx" ON "frameworkrequirements"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "complianceruns_projectId_idx" ON "complianceruns"("projectId");

-- CreateIndex
CREATE INDEX "complianceruns_status_idx" ON "complianceruns"("status");

-- CreateIndex
CREATE INDEX "complianceruns_projectId_frameworkId_idx" ON "complianceruns"("projectId", "frameworkId");

-- CreateIndex
CREATE INDEX "complianceruns_projectId_createdAt_idx" ON "complianceruns"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "complianceruns_legacyFirebaseId_idx" ON "complianceruns"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "frameworkmappings_mappingId_key" ON "frameworkmappings"("mappingId");

-- CreateIndex
CREATE INDEX "frameworkmappings_legacyFirebaseId_idx" ON "frameworkmappings"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "consistencyconflicts_projectId_idx" ON "consistencyconflicts"("projectId");

-- CreateIndex
CREATE INDEX "consistencyconflicts_projectId_status_idx" ON "consistencyconflicts"("projectId", "status");

-- CreateIndex
CREATE INDEX "consistencyconflicts_projectId_mappingId_idx" ON "consistencyconflicts"("projectId", "mappingId");

-- CreateIndex
CREATE INDEX "consistencyconflicts_legacyFirebaseId_idx" ON "consistencyconflicts"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "climatescenarios_projectId_idx" ON "climatescenarios"("projectId");

-- CreateIndex
CREATE INDEX "climatescenarios_pathwayId_idx" ON "climatescenarios"("pathwayId");

-- CreateIndex
CREATE INDEX "climatescenarios_legacyFirebaseId_idx" ON "climatescenarios"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "transitionlevertemplates_leverId_key" ON "transitionlevertemplates"("leverId");

-- CreateIndex
CREATE INDEX "transitionlevertemplates_category_idx" ON "transitionlevertemplates"("category");

-- CreateIndex
CREATE INDEX "transitionlevertemplates_legacyFirebaseId_idx" ON "transitionlevertemplates"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "sectorcategories_kod_idx" ON "sectorcategories"("kod");

-- CreateIndex
CREATE INDEX "sectorcategories_questionSetType_order_idx" ON "sectorcategories"("questionSetType", "order");

-- CreateIndex
CREATE INDEX "sectorcategories_order_idx" ON "sectorcategories"("order");

-- CreateIndex
CREATE INDEX "sectorcategories_legacyFirebaseId_idx" ON "sectorcategories"("legacyFirebaseId");

