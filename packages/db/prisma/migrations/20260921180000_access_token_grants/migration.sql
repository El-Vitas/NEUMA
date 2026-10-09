-- Los tokens dejan de poder todo lo que puede su dueño y pasan a poder solo
-- lo que tienen dado: en todos los espacios de su dueño, en espacios nombrados,
-- o las dos cosas sumadas.
--
-- Los tokens que ya existían se borran. Se hicieron con la regla anterior, en
-- la que un token podía todo lo de su dueño, y sin nada dado no podrían nada:
-- dejarlos vivos sería dejar llaves que nadie sabe qué abren. Nunca salieron de
-- la rama en que se hicieron, así que no hay agente conectado que se corte.
DELETE FROM "AccessToken";

ALTER TABLE "AccessToken" ADD COLUMN "workspaceId" TEXT NOT NULL;
ALTER TABLE "AccessToken" ADD COLUMN "allSpacesPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX "AccessToken_workspaceId_idx" ON "AccessToken"("workspaceId");

CREATE TABLE "AccessTokenGrant" (
  "id" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "spaceId" TEXT NOT NULL,
  "permissions" TEXT[],
  CONSTRAINT "AccessTokenGrant_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AccessTokenGrant" ADD CONSTRAINT "AccessTokenGrant_tokenId_fkey"
  FOREIGN KEY ("tokenId") REFERENCES "AccessToken"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "AccessTokenGrant" ADD CONSTRAINT "AccessTokenGrant_spaceId_fkey"
  FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON UPDATE CASCADE ON DELETE CASCADE;
CREATE UNIQUE INDEX "AccessTokenGrant_tokenId_spaceId_key" ON "AccessTokenGrant"("tokenId", "spaceId");
CREATE INDEX "AccessTokenGrant_spaceId_idx" ON "AccessTokenGrant"("spaceId");
