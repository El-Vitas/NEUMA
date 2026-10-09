-- Lo que un agente hizo, o intentó hacer, al escribir en Company Brain: una
-- fila por escritura. Sin llaves hacia la página ni el token, para que el
-- registro siga diciendo qué pasó aunque ya no existan.
CREATE TYPE "AgentActionOutcome" AS ENUM ('DONE', 'REFUSED', 'FAILED');

CREATE TABLE "AgentAction" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "tool" TEXT NOT NULL,
  "pageId" TEXT,
  "blockIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "outcome" "AgentActionOutcome" NOT NULL,
  "detail" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentAction_workspaceId_createdAt_idx" ON "AgentAction"("workspaceId", "createdAt");
CREATE INDEX "AgentAction_tokenId_createdAt_idx" ON "AgentAction"("tokenId", "createdAt");
CREATE INDEX "AgentAction_pageId_idx" ON "AgentAction"("pageId");
