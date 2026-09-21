-- El lugar de cada vista entre las pestañas de su colección.
--
-- Hasta ahora se leían ordenadas por «la principal primero» y después por
-- nombre, así que el orden lo decidía el alfabeto y no quien configura la
-- colección: renombrar una vista la movía de sitio, y no había forma de poner
-- el tablero antes que la tabla salvo llamándolo con una letra anterior.
--
-- Las que ya existen conservan el orden con el que se venían leyendo, para que
-- ninguna colección cambie de aspecto por esta migración.
ALTER TABLE "PageSchemaView" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

WITH "ordered" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "pageId" ORDER BY "isDefault" DESC, "name" ASC) - 1 AS "position"
  FROM "PageSchemaView"
)
UPDATE "PageSchemaView"
SET "order" = "ordered"."position"
FROM "ordered"
WHERE "PageSchemaView"."id" = "ordered"."id";

CREATE INDEX "PageSchemaView_pageId_order_idx" ON "PageSchemaView"("pageId", "order");
