-- AlterTable
ALTER TABLE "Space" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- Spaces made before this column had no order of their own, so the one they were
-- already listed in — by name — becomes the one they keep until somebody moves them.
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "workspaceId" ORDER BY "name") - 1 AS position
  FROM "Space"
)
UPDATE "Space" SET "order" = ordered.position FROM ordered WHERE "Space"."id" = ordered."id";

-- CreateIndex
CREATE INDEX "Space_workspaceId_order_idx" ON "Space"("workspaceId", "order");
