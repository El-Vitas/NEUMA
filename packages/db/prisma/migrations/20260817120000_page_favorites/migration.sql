-- CreateTable
CREATE TABLE "PageFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageFavorite_userId_pageId_key" ON "PageFavorite"("userId", "pageId");

-- CreateIndex
CREATE INDEX "PageFavorite_userId_order_idx" ON "PageFavorite"("userId", "order");

-- AddForeignKey
ALTER TABLE "PageFavorite" ADD CONSTRAINT "PageFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageFavorite" ADD CONSTRAINT "PageFavorite_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
