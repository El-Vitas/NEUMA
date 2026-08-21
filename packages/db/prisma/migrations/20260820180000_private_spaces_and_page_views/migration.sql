-- Un área que es de una sola persona. Se distingue de RESTRICTED en que no se
-- invita a nadie por defecto y en que su dueña es quien decide compartirla.
ALTER TYPE "SpaceVisibility" ADD VALUE IF NOT EXISTS 'PRIVATE';

ALTER TABLE "Space" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Space" ADD CONSTRAINT "Space_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX "Space_ownerId_idx" ON "Space"("ownerId");

-- Quién leyó qué y cuándo. Se guarda por separado de la página porque es un
-- registro que crece sin parar y que alguien puede querer apagar.
CREATE TABLE "PageView" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX "PageView_pageId_viewedAt_idx" ON "PageView"("pageId", "viewedAt");
CREATE INDEX "PageView_userId_idx" ON "PageView"("userId");

-- Registrar quién lee qué es dato sensible; se puede apagar para todo el sitio.
ALTER TABLE "Workspace" ADD COLUMN "pageViewsEnabled" BOOLEAN NOT NULL DEFAULT true;
