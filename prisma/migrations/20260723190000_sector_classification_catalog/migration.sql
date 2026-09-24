-- CreateTable
CREATE TABLE "sasbmacrosectors" (
    "id" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelTr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sasbmacrosectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sasbsubsectors" (
    "id" TEXT NOT NULL,
    "macroId" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelTr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sasbsubsectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nacecodemappings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionTr" TEXT NOT NULL DEFAULT '',
    "sasbSubSectorId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "legacyFirebaseId" TEXT,
    "createdBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nacecodemappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sasbmacrosectors_sortOrder_idx" ON "sasbmacrosectors"("sortOrder");

-- CreateIndex
CREATE INDEX "sasbmacrosectors_legacyFirebaseId_idx" ON "sasbmacrosectors"("legacyFirebaseId");

-- CreateIndex
CREATE INDEX "sasbsubsectors_macroId_idx" ON "sasbsubsectors"("macroId");

-- CreateIndex
CREATE INDEX "sasbsubsectors_sortOrder_idx" ON "sasbsubsectors"("sortOrder");

-- CreateIndex
CREATE INDEX "sasbsubsectors_legacyFirebaseId_idx" ON "sasbsubsectors"("legacyFirebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "nacecodemappings_code_key" ON "nacecodemappings"("code");

-- CreateIndex
CREATE INDEX "nacecodemappings_sasbSubSectorId_idx" ON "nacecodemappings"("sasbSubSectorId");

-- CreateIndex
CREATE INDEX "nacecodemappings_sortOrder_idx" ON "nacecodemappings"("sortOrder");

-- CreateIndex
CREATE INDEX "nacecodemappings_legacyFirebaseId_idx" ON "nacecodemappings"("legacyFirebaseId");
