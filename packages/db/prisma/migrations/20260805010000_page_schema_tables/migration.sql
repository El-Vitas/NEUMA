-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "propertyValues" JSONB;

-- CreateTable
CREATE TABLE "PageSchemaProperty" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "DatabasePropertyType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageSchemaProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageSchemaView" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DatabaseViewType" NOT NULL,
    "configuration" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageSchemaView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageSchemaProperty_pageId_key_key" ON "PageSchemaProperty"("pageId", "key");

-- CreateIndex
CREATE INDEX "PageSchemaProperty_pageId_order_idx" ON "PageSchemaProperty"("pageId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PageSchemaView_pageId_name_key" ON "PageSchemaView"("pageId", "name");

-- CreateIndex
CREATE INDEX "PageSchemaView_pageId_type_idx" ON "PageSchemaView"("pageId", "type");

-- AddForeignKey
ALTER TABLE "PageSchemaProperty" ADD CONSTRAINT "PageSchemaProperty_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageSchemaView" ADD CONSTRAINT "PageSchemaView_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
