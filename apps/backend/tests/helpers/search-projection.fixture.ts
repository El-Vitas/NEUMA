import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

/** Una tabla con columna de búsqueda generada, que `db push` no sabe crear, y la migración que la define. */
interface SearchableTable {
  readonly expectedGinIndexCount: number;
  readonly migration: string;
  readonly table: string;
}

const SEARCHABLE_TABLES: readonly SearchableTable[] = [
  { expectedGinIndexCount: 2, migration: '20260802020000_search_storage_foundation', table: 'SearchDocument' },
  { expectedGinIndexCount: 2, migration: '20260928120000_page_blocks', table: 'PageBlock' },
];

const migrationPath = (migration: string): string =>
  resolve(process.cwd(), `../../packages/db/prisma/migrations/${migration}/migration.sql`);

const searchVectorColumnPattern = (table: string): RegExp =>
  new RegExp(`ALTER TABLE "${table}"\\s+ADD COLUMN "searchVector"[\\s\\S]*?\\) STORED;`);

const ginIndexPattern = (table: string): RegExp =>
  new RegExp(`CREATE INDEX[^;]*?ON "${table}" USING GIN\\s*\\([\\s\\S]*?\\);`, 'g');

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
`;

const extractSearchVectorColumnStatement = (migrationSql: string, searchable: SearchableTable): string => {
  const match = migrationSql.match(searchVectorColumnPattern(searchable.table));
  if (match === null)
    throw new Error(
      `Could not find the generated "searchVector" column statement for "${searchable.table}" in ` +
        `${migrationPath(searchable.migration)}. The migration was restructured — update ` +
        'tests/helpers/search-projection.fixture.ts to match its new shape.',
    );
  return match[0];
};

const extractGinIndexStatements = (migrationSql: string, searchable: SearchableTable): readonly string[] => {
  const matches = [...migrationSql.matchAll(ginIndexPattern(searchable.table))].map((match) => match[0]);
  if (matches.length !== searchable.expectedGinIndexCount)
    throw new Error(
      `Expected exactly ${String(searchable.expectedGinIndexCount)} "USING GIN" index statements for ` +
        `"${searchable.table}" in ${migrationPath(searchable.migration)}, found ${String(matches.length)}. ` +
        'The migration was restructured — update tests/helpers/search-projection.fixture.ts to match its new shape.',
    );
  return matches;
};

/** Lo que hay que correr para que una tabla quede con su columna de búsqueda, como en la migración. */
const listSearchableTableStatements = (searchable: SearchableTable): readonly string[] => {
  const migrationSql = readFileSync(migrationPath(searchable.migration), 'utf8');
  return [
    `ALTER TABLE "${searchable.table}" DROP COLUMN IF EXISTS "searchVector";`,
    extractSearchVectorColumnStatement(migrationSql, searchable),
    ...extractGinIndexStatements(migrationSql, searchable),
  ];
};

export const applySearchDocumentGeneratedColumn = async (schemaScopedDatabaseUrl: string): Promise<void> => {
  const statements = SEARCHABLE_TABLES.flatMap(listSearchableTableStatements);
  const client = new Client({ connectionString: schemaScopedDatabaseUrl });
  await client.connect();
  try {
    await client.query(EXTENSION_AND_FUNCTION_SQL);
    for (const statement of statements) await client.query(statement);
  } finally {
    await client.end();
  }
};
