-- Un token pasa a tener reglas también por página, y para cada página manda la
-- regla más cercana: la de la página o de su ancestro más próximo, después la
-- del espacio, después la de todos los espacios. Una regla sin permisos excluye.
--
-- Antes, lo dado en un espacio se sumaba a lo dado en todos. Ahora lo
-- reemplaza. Para que ningún token existente pierda ni gane nada, cada regla
-- de espacio pasa a llevar ya sumado lo que el token tenía en todos.
UPDATE "AccessTokenGrant" AS "grant"
SET "permissions" = ARRAY(
  SELECT DISTINCT "permission"
  FROM unnest("grant"."permissions" || "token"."allSpacesPermissions") AS "permission"
  ORDER BY "permission"
)
FROM "AccessToken" AS "token"
WHERE "token"."id" = "grant"."tokenId";

CREATE TABLE "AccessTokenPageGrant" (
  "id" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "permissions" TEXT[],
  CONSTRAINT "AccessTokenPageGrant_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AccessTokenPageGrant" ADD CONSTRAINT "AccessTokenPageGrant_tokenId_fkey"
  FOREIGN KEY ("tokenId") REFERENCES "AccessToken"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "AccessTokenPageGrant" ADD CONSTRAINT "AccessTokenPageGrant_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON UPDATE CASCADE ON DELETE CASCADE;
CREATE UNIQUE INDEX "AccessTokenPageGrant_tokenId_pageId_key" ON "AccessTokenPageGrant"("tokenId", "pageId");
CREATE INDEX "AccessTokenPageGrant_pageId_idx" ON "AccessTokenPageGrant"("pageId");
