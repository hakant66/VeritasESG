-- CreateTable
CREATE TABLE `segments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `segments_name_idx`(`name`),
    INDEX `segments_type_idx`(`type`),
    INDEX `segments_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `domains` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `category` VARCHAR(191) NOT NULL DEFAULT 'esg',
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `domains_name_key`(`name`),
    INDEX `domains_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sectorIds` JSON NOT NULL,
    `address` VARCHAR(191) NOT NULL DEFAULT '',
    `logoUrl` VARCHAR(191) NULL,
    `websiteUrl` VARCHAR(191) NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `brandPortfolio` TEXT NOT NULL DEFAULT '',
    `sectoralDefinition` TEXT NOT NULL DEFAULT '',
    `naceCode` VARCHAR(191) NOT NULL DEFAULT '',
    `naceDescription` VARCHAR(191) NOT NULL DEFAULT '',
    `sasbMacroSector` VARCHAR(191) NOT NULL DEFAULT '',
    `sasbSubSectorSics` VARCHAR(191) NOT NULL DEFAULT '',
    `headquartersCountry` VARCHAR(191) NOT NULL DEFAULT '',
    `operationGeographies` TEXT NOT NULL DEFAULT '',
    `employeeCountTotal` INTEGER NULL,
    `employeeCountBlueCollar` INTEGER NULL,
    `employeeCountWhiteCollar` INTEGER NULL,
    `employeeCountMale` INTEGER NULL,
    `employeeCountFemale` INTEGER NULL,
    `employeeContractBreakdown` TEXT NOT NULL DEFAULT '',
    `taxNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `reportingCurrency` VARCHAR(191) NOT NULL DEFAULT '',
    `annualTurnoverMeur` DOUBLE NULL,
    `totalAssetsMeur` DOUBLE NULL,
    `legalName` VARCHAR(191) NOT NULL DEFAULT '',
    `employeeCountPermanent` INTEGER NULL,
    `employeeCountTemporary` INTEGER NULL,
    `reportingFrameworkKeys` JSON NOT NULL,
    `csrdScopeEmployeeCount` INTEGER NULL,
    `csrdScopeTurnoverMeur` DOUBLE NULL,
    `csrdScopeAssetsMeur` DOUBLE NULL,
    `isPublicInterestEntity` BOOLEAN NOT NULL DEFAULT false,
    `esgSummary` JSON NOT NULL,
    `materialityFramework` VARCHAR(191) NOT NULL DEFAULT 'gri',
    `materialityAssessment` JSON NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customers_name_idx`(`name`),
    INDEX `customers_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT '',
    `address` TEXT NOT NULL DEFAULT '',
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `branches_customerId_idx`(`customerId`),
    INDEX `branches_customerId_name_idx`(`customerId`, `name`),
    INDEX `branches_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contacts` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `linkedinUrl` VARCHAR(191) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contacts_customerId_idx`(`customerId`),
    INDEX `contacts_branchId_idx`(`branchId`),
    INDEX `contacts_email_idx`(`email`),
    INDEX `contacts_customerId_email_idx`(`customerId`, `email`),
    INDEX `contacts_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sectorId` VARCHAR(191) NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `templates_sectorId_idx`(`sectorId`),
    INDEX `templates_sectorId_name_idx`(`sectorId`, `name`),
    INDEX `templates_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templatepages` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `briefText` TEXT NOT NULL DEFAULT '',
    `briefFileUrl` VARCHAR(191) NULL,
    `pageKind` VARCHAR(191) NOT NULL DEFAULT 'customer_question_set',
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `templatepages_templateId_idx`(`templateId`),
    INDEX `templatepages_templateId_order_idx`(`templateId`, `order`),
    INDEX `templatepages_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questions` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `sectorId` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NULL,
    `domainIds` JSON NOT NULL,
    `bolum` VARCHAR(191) NOT NULL DEFAULT '',
    `kod` VARCHAR(191) NOT NULL,
    `baslik` VARCHAR(191) NOT NULL,
    `soru` TEXT NOT NULL,
    `firmaYaniti` TEXT NOT NULL DEFAULT '',
    `firmaYanitiYil1` TEXT NOT NULL DEFAULT '',
    `firmaYanitiYil2` TEXT NOT NULL DEFAULT '',
    `firmaYanitiYil3` TEXT NOT NULL DEFAULT '',
    `firmaNot` TEXT NOT NULL DEFAULT '',
    `ilgiliBirim` VARCHAR(191) NOT NULL DEFAULT '',
    `veriDogrulugu` VARCHAR(191) NOT NULL DEFAULT '',
    `aciklama` TEXT NOT NULL DEFAULT '',
    `aciklamaVideoUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `ornekYanit` TEXT NOT NULL DEFAULT '',
    `dayanak` TEXT NOT NULL DEFAULT '',
    `onay` VARCHAR(191) NOT NULL DEFAULT '',
    `raporYeri` VARCHAR(191) NOT NULL DEFAULT '',
    `reportingItr` VARCHAR(191) NOT NULL DEFAULT '',
    `tsrs1` VARCHAR(191) NOT NULL DEFAULT '',
    `tsrs2` VARCHAR(191) NOT NULL DEFAULT '',
    `sasbRtCh` VARCHAR(191) NOT NULL DEFAULT '',
    `gri` VARCHAR(191) NOT NULL DEFAULT '',
    `msci` VARCHAR(191) NOT NULL DEFAULT '',
    `esrs` VARCHAR(191) NOT NULL DEFAULT '',
    `kayit` VARCHAR(191) NOT NULL DEFAULT '',
    `numara` INTEGER NULL,
    `thematicGroup` VARCHAR(191) NOT NULL DEFAULT '',
    `isMandatory` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `answerFormat` VARCHAR(191) NOT NULL DEFAULT 'textarea',
    `soruCogaltma` VARCHAR(191) NOT NULL DEFAULT 'yok',
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `questions_templateId_idx`(`templateId`),
    INDEX `questions_sectorId_idx`(`sectorId`),
    INDEX `questions_pageId_idx`(`pageId`),
    INDEX `questions_templateId_pageId_order_idx`(`templateId`, `pageId`, `order`),
    INDEX `questions_templateId_thematicGroup_numara_idx`(`templateId`, `thematicGroup`, `numara`),
    INDEX `questions_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projectquestions` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `sourceQuestionId` VARCHAR(191) NOT NULL,
    `sourceTemplateId` VARCHAR(191) NOT NULL,
    `sectorId` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NULL,
    `domainIds` JSON NOT NULL,
    `bolum` VARCHAR(191) NOT NULL DEFAULT '',
    `kod` VARCHAR(191) NOT NULL,
    `baslik` VARCHAR(191) NOT NULL,
    `soru` TEXT NOT NULL,
    `firmaYaniti` TEXT NOT NULL DEFAULT '',
    `firmaYanitiYil1` TEXT NOT NULL DEFAULT '',
    `firmaYanitiYil2` TEXT NOT NULL DEFAULT '',
    `firmaYanitiYil3` TEXT NOT NULL DEFAULT '',
    `firmaNot` TEXT NOT NULL DEFAULT '',
    `ilgiliBirim` VARCHAR(191) NOT NULL DEFAULT '',
    `veriDogrulugu` VARCHAR(191) NOT NULL DEFAULT '',
    `aciklama` TEXT NOT NULL DEFAULT '',
    `aciklamaVideoUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `ornekYanit` TEXT NOT NULL DEFAULT '',
    `dayanak` TEXT NOT NULL DEFAULT '',
    `onay` VARCHAR(191) NOT NULL DEFAULT '',
    `raporYeri` VARCHAR(191) NOT NULL DEFAULT '',
    `reportingItr` VARCHAR(191) NOT NULL DEFAULT '',
    `tsrs1` VARCHAR(191) NOT NULL DEFAULT '',
    `tsrs2` VARCHAR(191) NOT NULL DEFAULT '',
    `sasbRtCh` VARCHAR(191) NOT NULL DEFAULT '',
    `gri` VARCHAR(191) NOT NULL DEFAULT '',
    `msci` VARCHAR(191) NOT NULL DEFAULT '',
    `esrs` VARCHAR(191) NOT NULL DEFAULT '',
    `kayit` VARCHAR(191) NOT NULL DEFAULT '',
    `numara` INTEGER NULL,
    `thematicGroup` VARCHAR(191) NOT NULL DEFAULT '',
    `isMandatory` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `answerFormat` VARCHAR(191) NOT NULL DEFAULT 'textarea',
    `soruCogaltma` VARCHAR(191) NOT NULL DEFAULT 'yok',
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `projectquestions_projectId_idx`(`projectId`),
    INDEX `projectquestions_sourceQuestionId_idx`(`sourceQuestionId`),
    INDEX `projectquestions_sourceTemplateId_idx`(`sourceTemplateId`),
    INDEX `projectquestions_sectorId_idx`(`sectorId`),
    INDEX `projectquestions_pageId_idx`(`pageId`),
    INDEX `projectquestions_projectId_pageId_order_idx`(`projectId`, `pageId`, `order`),
    INDEX `projectquestions_projectId_sourceQuestionId_idx`(`projectId`, `sourceQuestionId`),
    INDEX `projectquestions_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `domainIds` JSON NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'Project',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `startDate` VARCHAR(191) NULL,
    `endDate` VARCHAR(191) NULL,
    `progress` INTEGER NULL,
    `helpVideoUrl` VARCHAR(191) NULL,
    `allowMultipleAssignments` BOOLEAN NOT NULL DEFAULT false,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `projects_customerId_idx`(`customerId`),
    INDEX `projects_templateId_idx`(`templateId`),
    INDEX `projects_customerId_status_idx`(`customerId`, `status`),
    INDEX `projects_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projectpages` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `sourceTemplatePageId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `briefText` TEXT NOT NULL DEFAULT '',
    `briefFileUrl` VARCHAR(191) NULL,
    `pageKind` VARCHAR(191) NOT NULL DEFAULT 'customer_question_set',
    `draftContent` TEXT NOT NULL DEFAULT '',
    `draftStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `answerUpdatedFlag` BOOLEAN NOT NULL DEFAULT false,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `projectpages_projectId_idx`(`projectId`),
    INDEX `projectpages_sourceTemplatePageId_idx`(`sourceTemplatePageId`),
    INDEX `projectpages_projectId_order_idx`(`projectId`, `order`),
    INDEX `projectpages_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projectuserassignments` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `projectuserassignments_projectId_idx`(`projectId`),
    INDEX `projectuserassignments_userId_idx`(`userId`),
    INDEX `projectuserassignments_legacyFirebaseId_idx`(`legacyFirebaseId`),
    UNIQUE INDEX `projectuserassignments_projectId_userId_key`(`projectId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assignments` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NOT NULL,
    `recipientType` VARCHAR(191) NOT NULL,
    `questionIds` JSON NOT NULL,
    `token` VARCHAR(191) NULL,
    `tokenExpiry` DATETIME(3) NULL,
    `beginDate` DATETIME(3) NULL,
    `deadline` DATETIME(3) NULL,
    `message` TEXT NOT NULL DEFAULT '',
    `sentAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `assignedBy` VARCHAR(191) NULL,
    `assignedByName` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `assigneeNoticeSentAt` DATETIME(3) NULL,
    `assigneeNoticeSentByUserId` VARCHAR(191) NULL,
    `assigneeNoticeSentByName` VARCHAR(191) NULL,
    `assigneeNoticeSummary` TEXT NULL,
    `assigneeNoticeHasNotes` BOOLEAN NOT NULL DEFAULT false,
    `assigneeNoticeHasEvidence` BOOLEAN NOT NULL DEFAULT false,
    `assigneeNoticeItems` JSON NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `assignments_projectId_idx`(`projectId`),
    INDEX `assignments_recipientId_idx`(`recipientId`),
    INDEX `assignments_token_idx`(`token`),
    INDEX `assignments_assignedBy_idx`(`assignedBy`),
    INDEX `assignments_projectId_recipientId_idx`(`projectId`, `recipientId`),
    INDEX `assignments_projectId_status_idx`(`projectId`, `status`),
    INDEX `assignments_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `answers` (
    `id` VARCHAR(191) NOT NULL,
    `assignmentId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `latestAnswer` TEXT NOT NULL DEFAULT '',
    `latestFileUrl` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NOT NULL,
    `comment` TEXT NOT NULL DEFAULT '',
    `answerNotes` JSON NULL,
    `evidenceName` VARCHAR(191) NULL,
    `submittedByUserId` VARCHAR(191) NULL,
    `onBehalfOfUserId` VARCHAR(191) NULL,
    `workflowStatus` VARCHAR(191) NULL,
    `workflowStatusLog` JSON NULL,
    `reviewComments` JSON NULL,
    `adminReviewStatus` VARCHAR(191) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `answers_assignmentId_idx`(`assignmentId`),
    INDEX `answers_questionId_idx`(`questionId`),
    INDEX `answers_projectId_idx`(`projectId`),
    INDEX `answers_contactId_idx`(`contactId`),
    INDEX `answers_submittedByUserId_idx`(`submittedByUserId`),
    INDEX `answers_onBehalfOfUserId_idx`(`onBehalfOfUserId`),
    INDEX `answers_workflowStatus_idx`(`workflowStatus`),
    INDEX `answers_projectId_assignmentId_questionId_idx`(`projectId`, `assignmentId`, `questionId`),
    INDEX `answers_legacyFirebaseId_idx`(`legacyFirebaseId`),
    UNIQUE INDEX `answers_projectId_questionId_contactId_key`(`projectId`, `questionId`, `contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `answerversions` (
    `id` VARCHAR(191) NOT NULL,
    `answerId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `answerText` TEXT NOT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `changedAt` DATETIME(3) NOT NULL,
    `changeNote` VARCHAR(191) NOT NULL DEFAULT '',
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `answerversions_answerId_idx`(`answerId`),
    INDEX `answerversions_questionId_idx`(`questionId`),
    INDEX `answerversions_answerId_changedAt_idx`(`answerId`, `changedAt`),
    INDEX `answerversions_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commentmessages` (
    `id` VARCHAR(191) NOT NULL,
    `authorType` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `commentmessages_authorId_idx`(`authorId`),
    INDEX `commentmessages_authorType_authorId_idx`(`authorType`, `authorId`),
    INDEX `commentmessages_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platformusers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NULL,
    `avatarUrl` TEXT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'customer',
    `department` VARCHAR(191) NOT NULL,
    `isConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `contactId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'tr',
    `autoShowHelpOnOpen` BOOLEAN NOT NULL DEFAULT false,
    `lastLoginAt` DATETIME(3) NULL,
    `passwordUpdatedAt` DATETIME(3) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `platformusers_email_key`(`email`),
    INDEX `platformusers_role_idx`(`role`),
    INDEX `platformusers_contactId_idx`(`contactId`),
    INDEX `platformusers_customerId_idx`(`customerId`),
    INDEX `platformusers_customerId_role_idx`(`customerId`, `role`),
    INDEX `platformusers_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otpcodes` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `otpcodes_email_key`(`email`),
    INDEX `otpcodes_email_code_idx`(`email`, `code`),
    INDEX `otpcodes_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aidrafts` (
    `id` VARCHAR(191) NOT NULL,
    `projectPageId` VARCHAR(191) NOT NULL,
    `promptUsed` TEXT NOT NULL,
    `draftContent` TEXT NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `aidrafts_projectPageId_idx`(`projectPageId`),
    INDEX `aidrafts_approvedBy_idx`(`approvedBy`),
    INDEX `aidrafts_projectPageId_generatedAt_idx`(`projectPageId`, `generatedAt`),
    INDEX `aidrafts_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditlogs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `userEmail` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `collection` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NULL,
    `details` TEXT NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `emailMessageId` VARCHAR(191) NULL,
    `emailRecipientEmail` VARCHAR(191) NULL,
    `emailDeliveryStatus` VARCHAR(191) NULL,
    `emailDeliveryDetail` TEXT NULL,
    `emailDeliveryAt` DATETIME(3) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auditlogs_userId_idx`(`userId`),
    INDEX `auditlogs_collection_idx`(`collection`),
    INDEX `auditlogs_recordId_idx`(`recordId`),
    INDEX `auditlogs_projectId_idx`(`projectId`),
    INDEX `auditlogs_emailMessageId_idx`(`emailMessageId`),
    INDEX `auditlogs_emailRecipientEmail_idx`(`emailRecipientEmail`),
    INDEX `auditlogs_projectId_timestamp_idx`(`projectId`, `timestamp`),
    INDEX `auditlogs_collection_recordId_idx`(`collection`, `recordId`),
    INDEX `auditlogs_collection_emailMessageId_idx`(`collection`, `emailMessageId`),
    INDEX `auditlogs_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledgebases` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `domainIds` JSON NOT NULL,
    `domainId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `knowledgebases_domainId_idx`(`domainId`),
    INDEX `knowledgebases_projectId_idx`(`projectId`),
    INDEX `knowledgebases_customerId_idx`(`customerId`),
    INDEX `knowledgebases_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kbdocuments` (
    `id` VARCHAR(191) NOT NULL,
    `kbId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `text` TEXT NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `kbdocuments_kbId_idx`(`kbId`),
    INDEX `kbdocuments_kbId_createdAt_idx`(`kbId`, `createdAt`),
    INDEX `kbdocuments_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kbingestjobs` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `kbId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `chunkCount` INTEGER NULL,
    `error` TEXT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `kbingestjobs_documentId_idx`(`documentId`),
    INDEX `kbingestjobs_kbId_idx`(`kbId`),
    INDEX `kbingestjobs_documentId_createdAt_idx`(`documentId`, `createdAt`),
    INDEX `kbingestjobs_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kbchunks` (
    `id` VARCHAR(191) NOT NULL,
    `kbId` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `chunkIndex` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `qdrantPointId` VARCHAR(191) NOT NULL,
    `embeddingModel` VARCHAR(191) NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `kbchunks_kbId_idx`(`kbId`),
    INDEX `kbchunks_documentId_idx`(`documentId`),
    INDEX `kbchunks_customerId_idx`(`customerId`),
    INDEX `kbchunks_projectId_idx`(`projectId`),
    INDEX `kbchunks_qdrantPointId_idx`(`qdrantPointId`),
    INDEX `kbchunks_legacyFirebaseId_idx`(`legacyFirebaseId`),
    UNIQUE INDEX `kbchunks_documentId_chunkIndex_key`(`documentId`, `chunkIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `translations` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `en` TEXT NOT NULL,
    `tr` TEXT NOT NULL,
    `group` VARCHAR(191) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `translations_key_key`(`key`),
    INDEX `translations_group_idx`(`group`),
    INDEX `translations_group_key_idx`(`group`, `key`),
    INDEX `translations_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emailsettings` (
    `id` VARCHAR(191) NOT NULL,
    `fromName` VARCHAR(191) NOT NULL,
    `fromEmail` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'smtp',
    `apiKey` VARCHAR(191) NULL,
    `smtpHost` VARCHAR(191) NULL,
    `smtpPort` INTEGER NULL,
    `smtpUser` VARCHAR(191) NULL,
    `smtpPass` VARCHAR(191) NULL,
    `smtpSecure` BOOLEAN NOT NULL DEFAULT false,
    `passwordResetSubject` VARCHAR(191) NOT NULL,
    `passwordResetBody` TEXT NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `emailsettings_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appsettings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `appsettings_key_key`(`key`),
    INDEX `appsettings_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scheduledjobs` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `command` TEXT NOT NULL,
    `cronExpression` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `lastRunAt` DATETIME(3) NULL,
    `lastRunStatus` VARCHAR(191) NOT NULL DEFAULT 'never',
    `lastRunOutput` TEXT NOT NULL DEFAULT '',
    `nextRunAt` DATETIME(3) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `scheduledjobs_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emissionfactors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `activityUnit` VARCHAR(191) NOT NULL,
    `factorValue` DOUBLE NOT NULL,
    `factorUnit` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `versionYear` INTEGER NOT NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Global',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NOT NULL DEFAULT '',
    `userOverridable` BOOLEAN NOT NULL DEFAULT false,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `emissionfactors_name_key`(`name`),
    INDEX `emissionfactors_scope_isActive_idx`(`scope`, `isActive`),
    INDEX `emissionfactors_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emissionentries` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `activityValue` DOUBLE NOT NULL,
    `activityUnit` VARCHAR(191) NOT NULL,
    `emissionFactorId` VARCHAR(191) NOT NULL,
    `factorValue` DOUBLE NOT NULL,
    `facilityId` VARCHAR(191) NULL,
    `facilityName` VARCHAR(191) NOT NULL DEFAULT '',
    `resultTCO2e` DOUBLE NOT NULL,
    `calculationFormula` TEXT NOT NULL DEFAULT '',
    `notes` TEXT NOT NULL DEFAULT '',
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `emissionentries_customerId_idx`(`customerId`),
    INDEX `emissionentries_year_idx`(`year`),
    INDEX `emissionentries_emissionFactorId_idx`(`emissionFactorId`),
    INDEX `emissionentries_facilityId_idx`(`facilityId`),
    INDEX `emissionentries_customerId_year_scope_idx`(`customerId`, `year`, `scope`),
    INDEX `emissionentries_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emissionintensityinputs` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `revenueMillionTRY` DOUBLE NULL,
    `productionTons` DOUBLE NULL,
    `employeeCount` DOUBLE NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `emissionintensityinputs_customerId_idx`(`customerId`),
    INDEX `emissionintensityinputs_legacyFirebaseId_idx`(`legacyFirebaseId`),
    UNIQUE INDEX `emissionintensityinputs_customerId_year_key`(`customerId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scope2marketdatas` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `certificateMWh` DOUBLE NOT NULL DEFAULT 0,
    `contractualFactorKgCO2ePerKWh` DOUBLE NOT NULL DEFAULT 0,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `scope2marketdatas_customerId_idx`(`customerId`),
    INDEX `scope2marketdatas_legacyFirebaseId_idx`(`legacyFirebaseId`),
    UNIQUE INDEX `scope2marketdatas_customerId_year_key`(`customerId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metricdefinitions` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameTr` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `isRequired` BOOLEAN NOT NULL DEFAULT true,
    `scope` VARCHAR(191) NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `metricdefinitions_code_key`(`code`),
    INDEX `metricdefinitions_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metricentries` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `facilityId` VARCHAR(191) NULL,
    `facilityName` VARCHAR(191) NOT NULL DEFAULT '',
    `metricDefinitionId` VARCHAR(191) NOT NULL,
    `metricDefinitionCode` VARCHAR(191) NOT NULL,
    `value` DOUBLE NULL,
    `unit` VARCHAR(191) NOT NULL,
    `notes` TEXT NOT NULL DEFAULT '',
    `approvalStage` VARCHAR(191) NOT NULL DEFAULT 'DATA_ENTRY',
    `approvalStatusLog` JSON NOT NULL,
    `ownerUserId` VARCHAR(191) NULL,
    `emissionEntryId` VARCHAR(191) NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `metricentries_customerId_idx`(`customerId`),
    INDEX `metricentries_metricDefinitionId_idx`(`metricDefinitionId`),
    INDEX `metricentries_metricDefinitionCode_idx`(`metricDefinitionCode`),
    INDEX `metricentries_facilityId_idx`(`facilityId`),
    INDEX `metricentries_customerId_year_idx`(`customerId`, `year`),
    INDEX `metricentries_customerId_year_metricDefinitionCode_facilityI_idx`(`customerId`, `year`, `metricDefinitionCode`, `facilityId`),
    INDEX `metricentries_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materialitytopics` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `esrsId` VARCHAR(191) NOT NULL,
    `financialImpact` INTEGER NOT NULL DEFAULT 1,
    `impactSeverity` INTEGER NOT NULL DEFAULT 1,
    `probability` INTEGER NOT NULL DEFAULT 1,
    `stakeholderConcern` INTEGER NOT NULL DEFAULT 1,
    `isMaterial` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NOT NULL DEFAULT '',
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `materialitytopics_customerId_idx`(`customerId`),
    INDEX `materialitytopics_legacyFirebaseId_idx`(`legacyFirebaseId`),
    UNIQUE INDEX `materialitytopics_customerId_year_esrsId_key`(`customerId`, `year`, `esrsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materialityassessments` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `materialTopics` JSON NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `notes` TEXT NOT NULL DEFAULT '',
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `materialityassessments_customerId_idx`(`customerId`),
    INDEX `materialityassessments_legacyFirebaseId_idx`(`legacyFirebaseId`),
    UNIQUE INDEX `materialityassessments_customerId_year_key`(`customerId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grimaterialitymatricesrow` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `subject` VARCHAR(191) NOT NULL,
    `griMapping` VARCHAR(191) NOT NULL,
    `disclosures` TEXT NOT NULL,
    `notes` TEXT NOT NULL DEFAULT '',
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `grimaterialitymatricesrow_customerId_idx`(`customerId`),
    INDEX `grimaterialitymatricesrow_customerId_order_idx`(`customerId`, `order`),
    INDEX `grimaterialitymatricesrow_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `griassessmentscores` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `griRowId` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `financialImpact` INTEGER NOT NULL DEFAULT 0,
    `impactSeverity` INTEGER NOT NULL DEFAULT 0,
    `probability` INTEGER NOT NULL DEFAULT 0,
    `stakeholderConcern` INTEGER NOT NULL DEFAULT 0,
    `isMaterial` BOOLEAN NOT NULL DEFAULT false,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `griassessmentscores_customerId_idx`(`customerId`),
    INDEX `griassessmentscores_year_idx`(`year`),
    INDEX `griassessmentscores_legacyFirebaseId_idx`(`legacyFirebaseId`),
    UNIQUE INDEX `griassessmentscores_customerId_year_griRowId_key`(`customerId`, `year`, `griRowId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `esrsassessmentscores` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `esrsRowId` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `financialImpact` INTEGER NOT NULL DEFAULT 0,
    `impactSeverity` INTEGER NOT NULL DEFAULT 0,
    `probability` INTEGER NOT NULL DEFAULT 0,
    `stakeholderConcern` INTEGER NOT NULL DEFAULT 0,
    `isMaterial` BOOLEAN NOT NULL DEFAULT false,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `esrsassessmentscores_customerId_idx`(`customerId`),
    INDEX `esrsassessmentscores_year_idx`(`year`),
    INDEX `esrsassessmentscores_legacyFirebaseId_idx`(`legacyFirebaseId`),
    UNIQUE INDEX `esrsassessmentscores_customerId_year_esrsRowId_key`(`customerId`, `year`, `esrsRowId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `issbassessmentscores` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `issbRowId` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `financialImpact` INTEGER NOT NULL DEFAULT 0,
    `impactSeverity` INTEGER NOT NULL DEFAULT 0,
    `probability` INTEGER NOT NULL DEFAULT 0,
    `stakeholderConcern` INTEGER NOT NULL DEFAULT 0,
    `isMaterial` BOOLEAN NOT NULL DEFAULT false,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `issbassessmentscores_customerId_idx`(`customerId`),
    INDEX `issbassessmentscores_year_idx`(`year`),
    INDEX `issbassessmentscores_legacyFirebaseId_idx`(`legacyFirebaseId`),
    UNIQUE INDEX `issbassessmentscores_customerId_year_issbRowId_key`(`customerId`, `year`, `issbRowId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `frameworkrequirements` (
    `id` VARCHAR(191) NOT NULL,
    `frameworkId` VARCHAR(191) NOT NULL,
    `frameworkName` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '2023',
    `topicId` VARCHAR(191) NOT NULL,
    `topicName` VARCHAR(191) NOT NULL,
    `disclosureId` VARCHAR(191) NOT NULL,
    `disclosureName` VARCHAR(191) NOT NULL,
    `dataPointKeys` JSON NOT NULL,
    `alternateDataKeys` JSON NOT NULL,
    `description` TEXT NOT NULL,
    `guidance` TEXT NULL,
    `materiality` BOOLEAN NOT NULL DEFAULT false,
    `materialityTopic` VARCHAR(191) NULL,
    `conditions` JSON NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'high',
    `mandatory` BOOLEAN NOT NULL DEFAULT true,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `frameworkrequirements_disclosureId_key`(`disclosureId`),
    INDEX `frameworkrequirements_frameworkId_idx`(`frameworkId`),
    INDEX `frameworkrequirements_topicId_idx`(`topicId`),
    INDEX `frameworkrequirements_frameworkId_mandatory_idx`(`frameworkId`, `mandatory`),
    INDEX `frameworkrequirements_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complianceruns` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `frameworkId` VARCHAR(191) NOT NULL,
    `totalRequirements` INTEGER NOT NULL,
    `answeredRequirements` INTEGER NOT NULL,
    `completionPercentage` DOUBLE NOT NULL,
    `gaps` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'in_progress',
    `criticalGapCount` INTEGER NOT NULL DEFAULT 0,
    `validationStartedAt` DATETIME(3) NULL,
    `validationCompletedAt` DATETIME(3) NULL,
    `validationDurationMs` INTEGER NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `complianceruns_projectId_idx`(`projectId`),
    INDEX `complianceruns_status_idx`(`status`),
    INDEX `complianceruns_projectId_frameworkId_idx`(`projectId`, `frameworkId`),
    INDEX `complianceruns_projectId_createdAt_idx`(`projectId`, `createdAt`),
    INDEX `complianceruns_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `frameworkmappings` (
    `id` VARCHAR(191) NOT NULL,
    `mappingId` VARCHAR(191) NOT NULL,
    `mappingName` VARCHAR(191) NOT NULL,
    `equivalenceLevel` VARCHAR(191) NOT NULL,
    `varianceThresholdPercent` DOUBLE NOT NULL,
    `varianceReasonGuide` JSON NOT NULL,
    `frameworks` JSON NOT NULL,
    `reconciliationLogic` JSON NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `frameworkmappings_mappingId_key`(`mappingId`),
    INDEX `frameworkmappings_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consistencyconflicts` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `mappingId` VARCHAR(191) NOT NULL,
    `framework1` JSON NOT NULL,
    `framework2` JSON NOT NULL,
    `variance` JSON NOT NULL,
    `likelyCauses` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'unresolved',
    `resolution` JSON NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `consistencyconflicts_projectId_idx`(`projectId`),
    INDEX `consistencyconflicts_projectId_status_idx`(`projectId`, `status`),
    INDEX `consistencyconflicts_projectId_mappingId_idx`(`projectId`, `mappingId`),
    INDEX `consistencyconflicts_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `climatescenarios` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `scenarioName` VARCHAR(191) NULL,
    `scenarioDescription` TEXT NULL,
    `pathwayId` VARCHAR(191) NULL,
    `pathwayName` VARCHAR(191) NULL,
    `baselineEmissions` DOUBLE NULL,
    `baselineYear` INTEGER NULL,
    `targetYear` INTEGER NULL,
    `targetEmissions` DOUBLE NULL,
    `selectedLevers` JSON NOT NULL,
    `financialImpact` JSON NULL,
    `riskAssessment` JSON NULL,
    `sbtAlignment` JSON NULL,
    `roadmap` JSON NOT NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `climatescenarios_projectId_idx`(`projectId`),
    INDEX `climatescenarios_pathwayId_idx`(`pathwayId`),
    INDEX `climatescenarios_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transitionlevertemplates` (
    `id` VARCHAR(191) NOT NULL,
    `leverId` VARCHAR(191) NOT NULL,
    `leverName` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `applicableIndustries` JSON NOT NULL,
    `trl` INTEGER NULL,
    `maturity` VARCHAR(191) NULL,
    `emissionReductionRange` JSON NULL,
    `capexRange` JSON NULL,
    `opexRange` JSON NULL,
    `paybackRange` JSON NULL,
    `implementationDuration` JSON NULL,
    `technicalRisk` VARCHAR(191) NULL,
    `marketRisk` VARCHAR(191) NULL,
    `regulatoryRisk` VARCHAR(191) NULL,
    `sbtEligible` BOOLEAN NULL,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transitionlevertemplates_leverId_key`(`leverId`),
    INDEX `transitionlevertemplates_category_idx`(`category`),
    INDEX `transitionlevertemplates_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sectorcategories` (
    `id` VARCHAR(191) NOT NULL,
    `questionSetType` VARCHAR(191) NOT NULL DEFAULT 'sozel',
    `numara` INTEGER NULL,
    `kod` VARCHAR(191) NOT NULL,
    `baslik` VARCHAR(191) NOT NULL,
    `soru` TEXT NOT NULL,
    `bolum` VARCHAR(191) NOT NULL DEFAULT '',
    `firmaYaniti` TEXT NOT NULL DEFAULT '',
    `ilgiliBirim` VARCHAR(191) NOT NULL DEFAULT '',
    `veriDogrulugu` VARCHAR(191) NOT NULL DEFAULT '',
    `soruAciklama` TEXT NOT NULL DEFAULT '',
    `ornekYanit` TEXT NOT NULL DEFAULT '',
    `dayanak` TEXT NOT NULL DEFAULT '',
    `onay` VARCHAR(191) NOT NULL DEFAULT '',
    `tesisBazinda` VARCHAR(191) NOT NULL DEFAULT '',
    `ekZorunlu` VARCHAR(191) NOT NULL DEFAULT '',
    `raporYeri` VARCHAR(191) NOT NULL DEFAULT '',
    `reportingItr` VARCHAR(191) NOT NULL DEFAULT '',
    `atananSayfa` VARCHAR(191) NULL,
    `kayit` VARCHAR(191) NOT NULL DEFAULT '',
    `metadata` JSON NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `legacyFirebaseId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sectorcategories_kod_idx`(`kod`),
    INDEX `sectorcategories_questionSetType_order_idx`(`questionSetType`, `order`),
    INDEX `sectorcategories_order_idx`(`order`),
    INDEX `sectorcategories_legacyFirebaseId_idx`(`legacyFirebaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

