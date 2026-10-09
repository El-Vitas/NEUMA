-- Cada bloque de una página, para buscarlo y señalarlo por su id.
--
-- La clave es la pareja (página, bloque) porque un id de bloque solo es único
-- dentro de su página: duplicar una página o mover bloques a otra conserva los
-- ids. La llena el mismo proyector que la búsqueda, desde los eventos de la
-- página; al crearse la tabla queda vacía y se llena con el relleno de bloques.
CREATE TABLE "PageBlock" (
  "pageId" TEXT NOT NULL,
  "blockId" TEXT NOT NULL,
  "spaceId" TEXT NOT NULL,
  "parentBlockId" TEXT,
  "position" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "headingPath" TEXT[],
  "pageVersion" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageBlock_pkey" PRIMARY KEY ("pageId", "blockId")
);

-- Sin idioma por fila: los bloques se buscan con la configuración simple, como
-- las páginas que no declaran idioma, y sin acentos, como el resto de la búsqueda.
ALTER TABLE "PageBlock"
  ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, public.immutable_unaccent(coalesce("text", '')))
  ) STORED;

ALTER TABLE "PageBlock" ADD CONSTRAINT "PageBlock_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX "PageBlock_blockId_idx" ON "PageBlock"("blockId");
CREATE INDEX "PageBlock_spaceId_idx" ON "PageBlock"("spaceId");
CREATE INDEX "PageBlock_searchVector_gin_idx" ON "PageBlock" USING GIN ("searchVector");
CREATE INDEX "PageBlock_text_trgm_idx" ON "PageBlock" USING GIN ("text" gin_trgm_ops);
