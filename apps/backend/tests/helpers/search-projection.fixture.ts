import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

const MIGRATION_PATH = resolve(
  process.cwd(),
  '../../packages/db/prisma/migrations/20260802020000_search_storage_foundation/migration.sql',
);

const SEARCH_VECTOR_COLUMN_PATTERN = /ALTER TABLE "SearchDocument"\s+ADD COLUMN "searchVector"[\s\S]*?\) STORED;/;
const GIN_INDEX_PATTERN = /CREATE INDEX[\s\S]*?ON "SearchDocument" USING GIN\s*\([\s\S]*?\);/g;
const EXPECTED_GIN_INDEX_COUNT = 2;

const EXTENSION_AND_FUNCTION_SQL = `
  CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA public;
  CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public;

  CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  AS $$
    SELECT public.unaccent('public.unaccent'::regdictionary, $1);
  $$;

  ALTER TABLE "SearchDocument" DROP COLUMN IF EXISTS "searchVector";
`;

const readMigrationSql = (): string => readFileSync(MIGRATION_PATH, 'utf8');

const extractSearchVectorColumnStatement = (migrationSql: string): string => {
  const match = migrationSql.match(SEARCH_VECTOR_COLUMN_PATTERN);
  if (match === null)
    throw new Error(
      `Could not find the generated "searchVector" column statement in ${MIGRATION_PATH}. ` +
        'The migration was restructured — update SEARCH_VECTOR_COLUMN_PATTERN in ' +
        'tests/helpers/search-projection.fixture.ts to match its new shape.',
    );
  return match[0];
};

const extractGinIndexStatements = (migrationSql: string): readonly string[] => {
  const matches = [...migrationSql.matchAll(GIN_INDEX_PATTERN)].map((match) => match[0]);
  if (matches.length !== EXPECTED_GIN_INDEX_COUNT)
    throw new Error(
      `Expected exactly ${String(EXPECTED_GIN_INDEX_COUNT)} "USING GIN" index statements for "SearchDocument" in ` +
        `${MIGRATION_PATH}, found ${String(matches.length)}. The migration was restructured — update ` +
        'GIN_INDEX_PATTERN in tests/helpers/search-projection.fixture.ts to match its new shape.',
    );
  return matches;
};

export const applySearchDocumentGeneratedColumn = async (schemaScopedDatabaseUrl: string): Promise<void> => {
  const migrationSql = readMigrationSql();
  const searchVectorColumnStatement = extractSearchVectorColumnStatement(migrationSql);
  const ginIndexStatements = extractGinIndexStatements(migrationSql);

  const client = new Client({ connectionString: schemaScopedDatabaseUrl });
  await client.connect();
  try {
    await client.query(EXTENSION_AND_FUNCTION_SQL);
    await client.query(searchVectorColumnStatement);
    for (const statement of ginIndexStatements) await client.query(statement);
  } finally {
    await client.end();
  }
};
