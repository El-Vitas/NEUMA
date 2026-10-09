-- El agente puede darle un id a un pedido que crea algo, y mandar el mismo id
-- si reintenta: un reintento no deja una página o un comentario repetido.
ALTER TABLE "AgentAction" ADD COLUMN "requestId" TEXT;

-- El mismo id no puede estar dos veces en curso ni hecho con el mismo token.
-- Uno que se negó o falló no cuenta: el agente puede volver a intentarlo con él.
-- Es parcial, y por eso vive aquí y no en el esquema: Prisma no escribe índices
-- con condición. Dos reintentos a la vez los separa este índice, no una lectura.
CREATE UNIQUE INDEX "AgentAction_tokenId_requestId_live_key"
  ON "AgentAction" ("tokenId", "requestId")
  WHERE "requestId" IS NOT NULL AND "outcome" IN ('PENDING', 'DONE');
