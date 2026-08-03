CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$$;

DO $$
BEGIN
  CREATE TYPE "SearchSourceType" AS ENUM ('PAGE', 'DATABASE_RECORD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "SearchIndexingState" ADD VALUE IF NOT EXISTS 'PROCESSING';

ALTER TABLE "SearchDocument"
  ADD COLUMN "sourceType" "SearchSourceType",
  ADD COLUMN "sourceId" TEXT;

UPDATE "SearchDocument"
SET "sourceType" = 'PAGE',
    "sourceId" = "pageId";

ALTER TABLE "SearchDocument"
  ALTER COLUMN "sourceType" SET NOT NULL,
  ALTER COLUMN "sourceId" SET NOT NULL,
  DROP COLUMN "pageId";

ALTER TABLE "SearchDocument"
  ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(
      to_tsvector(
        CASE "language"
          WHEN 'en' THEN 'english'::regconfig
          WHEN 'es' THEN 'spanish'::regconfig
          ELSE 'simple'::regconfig
        END,
        public.immutable_unaccent(coalesce("title", ''))
      ),
      'A'
    ) || setweight(
      to_tsvector(
        CASE "language"
          WHEN 'en' THEN 'english'::regconfig
          WHEN 'es' THEN 'spanish'::regconfig
          ELSE 'simple'::regconfig
        END,
        public.immutable_unaccent(coalesce("extractedText", ''))
      ),
      'B'
    )
  ) STORED;

ALTER TABLE "SearchDocument"
  ADD CONSTRAINT "SearchDocument_language_check"
  CHECK ("language" IS NULL OR "language" IN ('en', 'es'));

CREATE UNIQUE INDEX "SearchDocument_sourceType_sourceId_key"
  ON "SearchDocument"("sourceType", "sourceId");

CREATE INDEX "SearchDocument_searchVector_gin_idx"
  ON "SearchDocument" USING GIN ("searchVector");

CREATE INDEX "SearchDocument_title_extractedText_trgm_idx"
  ON "SearchDocument" USING GIN ("title" gin_trgm_ops, "extractedText" gin_trgm_ops);
