CREATE TYPE "FileAssetLifecycle" AS ENUM ('ACTIVE', 'DELETED');

CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageId" TEXT,
    "databaseRecordId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "lifecycle" "FileAssetLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");
CREATE INDEX "FileAsset_workspaceId_lifecycle_idx" ON "FileAsset"("workspaceId", "lifecycle");
CREATE INDEX "FileAsset_ownerId_lifecycle_idx" ON "FileAsset"("ownerId", "lifecycle");
CREATE INDEX "FileAsset_pageId_lifecycle_idx" ON "FileAsset"("pageId", "lifecycle");
CREATE INDEX "FileAsset_databaseRecordId_lifecycle_idx" ON "FileAsset"("databaseRecordId", "lifecycle");
