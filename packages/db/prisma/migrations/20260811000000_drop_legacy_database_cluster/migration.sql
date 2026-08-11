-- Narrow the search source type to the single content primitive.
ALTER TYPE "SearchSourceType" RENAME TO "SearchSourceType_old";
CREATE TYPE "SearchSourceType" AS ENUM ('PAGE');
DELETE FROM "SearchDocument" WHERE "sourceType"::text <> 'PAGE';
ALTER TABLE "SearchDocument"
  ALTER COLUMN "sourceType" TYPE "SearchSourceType" USING ("sourceType"::text::"SearchSourceType");
DROP TYPE "SearchSourceType_old";

-- File assets only ever attach to pages now.
DROP INDEX IF EXISTS "FileAsset_databaseRecordId_lifecycle_idx";
ALTER TABLE "FileAsset" DROP COLUMN "databaseRecordId";

-- Drop the legacy database cluster. The four tables go together because their
-- foreign keys cascade.
DROP TABLE IF EXISTS "DatabaseRecord";
DROP TABLE IF EXISTS "DatabaseView";
DROP TABLE IF EXISTS "DatabaseProperty";
DROP TABLE IF EXISTS "Database";

DROP TYPE IF EXISTS "DatabaseTemplate";
DROP TYPE IF EXISTS "DatabaseLifecycle";
