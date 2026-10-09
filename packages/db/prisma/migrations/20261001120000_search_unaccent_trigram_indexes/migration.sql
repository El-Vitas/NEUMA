-- La búsqueda compara el texto sin tildes: immutable_unaccent("text"). Un índice
-- sobre la columna sola no sirve para esa expresión, así que cada búsqueda
-- recorría la tabla entera. Estos índices son sobre la misma expresión que
-- usan las consultas; los de la columna sola no los usaba nadie.

DROP INDEX IF EXISTS "PageBlock_text_trgm_idx";
CREATE INDEX "PageBlock_text_unaccent_trgm_idx"
  ON "PageBlock" USING GIN (public.immutable_unaccent("text") gin_trgm_ops);

DROP INDEX IF EXISTS "SearchDocument_title_extractedText_trgm_idx";
CREATE INDEX "SearchDocument_title_unaccent_trgm_idx"
  ON "SearchDocument" USING GIN (public.immutable_unaccent("title") gin_trgm_ops);
CREATE INDEX "SearchDocument_extractedText_unaccent_trgm_idx"
  ON "SearchDocument" USING GIN (public.immutable_unaccent("extractedText") gin_trgm_ops);
