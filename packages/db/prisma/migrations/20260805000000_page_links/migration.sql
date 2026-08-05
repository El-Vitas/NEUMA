-- CreateTable
CREATE TABLE "PageLink" (
    "id" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "targetPageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageLink_targetPageId_idx" ON "PageLink"("targetPageId");

-- CreateIndex
CREATE INDEX "PageLink_sourcePageId_idx" ON "PageLink"("sourcePageId");

-- CreateIndex
CREATE UNIQUE INDEX "PageLink_sourcePageId_targetPageId_key" ON "PageLink"("sourcePageId", "targetPageId");

-- AddForeignKey
ALTER TABLE "PageLink" ADD CONSTRAINT "PageLink_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageLink" ADD CONSTRAINT "PageLink_targetPageId_fkey" FOREIGN KEY ("targetPageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
