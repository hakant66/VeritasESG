-- Durable assignment reminder delivery log + indexes
CREATE TABLE IF NOT EXISTS "assignmentreminderlogs" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "reminderKey" TEXT NOT NULL,
  "recipientEmail" TEXT,
  "daysBefore" INTEGER,
  "daysAfter" INTEGER,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "legacyFirebaseId" TEXT,
  "createdBy" TEXT,
  "ownerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignmentreminderlogs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "assignmentreminderlogs_assignmentId_reminderKey_key"
  ON "assignmentreminderlogs"("assignmentId", "reminderKey");
CREATE INDEX IF NOT EXISTS "assignmentreminderlogs_assignmentId_idx"
  ON "assignmentreminderlogs"("assignmentId");
CREATE INDEX IF NOT EXISTS "assignmentreminderlogs_projectId_idx"
  ON "assignmentreminderlogs"("projectId");
CREATE INDEX IF NOT EXISTS "assignmentreminderlogs_sentAt_idx"
  ON "assignmentreminderlogs"("sentAt");
CREATE INDEX IF NOT EXISTS "assignmentreminderlogs_legacyFirebaseId_idx"
  ON "assignmentreminderlogs"("legacyFirebaseId");
