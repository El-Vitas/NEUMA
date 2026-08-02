CREATE TYPE "DatabaseTemplate" AS ENUM ('TASKS', 'PROJECTS', 'CUSTOM');
CREATE TYPE "DatabasePropertyType" AS ENUM ('TITLE', 'RICH_TEXT', 'SELECT', 'MULTI_SELECT', 'PERSON', 'DATE', 'CHECKBOX', 'NUMBER');
CREATE TYPE "DatabaseViewType" AS ENUM ('TABLE', 'BOARD');
CREATE TYPE "DatabaseLifecycle" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "Database" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "template" "DatabaseTemplate" NOT NULL DEFAULT 'CUSTOM',
    "lifecycle" "DatabaseLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Database_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DatabaseProperty" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "DatabasePropertyType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DatabaseProperty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DatabaseRecord" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "propertyValues" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "lifecycle" "DatabaseLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "pageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DatabaseRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DatabaseView" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DatabaseViewType" NOT NULL,
    "configuration" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DatabaseView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Database_spaceId_slug_key" ON "Database"("spaceId", "slug");
CREATE INDEX "Database_workspaceId_spaceId_lifecycle_idx" ON "Database"("workspaceId", "spaceId", "lifecycle");
CREATE INDEX "Database_spaceId_lifecycle_idx" ON "Database"("spaceId", "lifecycle");
CREATE UNIQUE INDEX "DatabaseProperty_databaseId_key_key" ON "DatabaseProperty"("databaseId", "key");
CREATE INDEX "DatabaseProperty_databaseId_order_idx" ON "DatabaseProperty"("databaseId", "order");
CREATE INDEX "DatabaseRecord_databaseId_lifecycle_order_idx" ON "DatabaseRecord"("databaseId", "lifecycle", "order");
CREATE INDEX "DatabaseRecord_databaseId_title_idx" ON "DatabaseRecord"("databaseId", "title");
CREATE INDEX "DatabaseRecord_pageId_idx" ON "DatabaseRecord"("pageId");
CREATE UNIQUE INDEX "DatabaseView_databaseId_name_key" ON "DatabaseView"("databaseId", "name");
CREATE INDEX "DatabaseView_databaseId_type_idx" ON "DatabaseView"("databaseId", "type");

ALTER TABLE "DatabaseProperty" ADD CONSTRAINT "DatabaseProperty_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatabaseRecord" ADD CONSTRAINT "DatabaseRecord_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatabaseView" ADD CONSTRAINT "DatabaseView_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Database" ADD CONSTRAINT "Database_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
