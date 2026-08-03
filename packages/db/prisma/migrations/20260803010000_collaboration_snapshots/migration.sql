CREATE TABLE "CollaborationSnapshot" (
    "id" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "state" BYTEA NOT NULL,
    "updateCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollaborationSnapshot_documentName_key" ON "CollaborationSnapshot"("documentName");
CREATE INDEX "CollaborationSnapshot_updatedAt_idx" ON "CollaborationSnapshot"("updatedAt");
