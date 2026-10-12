import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(process.cwd(), '../..');
const modelPath = resolve(repositoryRoot, 'packages/db/prisma/models/search-document.model.prisma');
const sourceTypeEnumPath = resolve(repositoryRoot, 'packages/db/prisma/enums/search-source-type.enum.prisma');
const searchTypesPath = resolve(repositoryRoot, 'apps/backend/src/modules/search/types/search.types.ts');
const baselineMigrationPath = resolve(repositoryRoot, 'packages/db/migrations/app/20261011T1850_baseline/migration.ts');
const uniqueConstraintsMigrationPath = resolve(
  repositoryRoot,
  'packages/db/migrations/app/20261011T2232_unique_constraints/migration.ts',
);

const readText = (path: string): string => readFileSync(path, 'utf8');

describe('search storage contract', () => {
  test('models a document by source type and source id', () => {
    const model = readText(modelPath);

    expect(model).toContain('sourceType    pg.enum(SearchSourceType)');
    expect(model).toContain('sourceId      String');
    expect(model).toContain('@@unique([sourceType, sourceId], map: "SearchDocument_sourceType_sourceId_key")');
    expect(model).not.toContain('pageId');
    expect(model).not.toContain('Unsupported');
  });

  test('defines the bilingual language contract and source type enum', () => {
    const model = readText(modelPath);
    const types = readText(searchTypesPath);

    expect(model).toContain('language      String?');
    expect(model).toContain("language = ANY (ARRAY['en'::text, 'es'::text])");
    expect(types).toContain("export type SearchLanguage = 'en' | 'es';");
    expect(readText(sourceTypeEnumPath)).toContain('PAGE');
  });

  test('enforces the source identity with a unique constraint', () => {
    const migration = readText(uniqueConstraintsMigrationPath);

    expect(migration).toContain("['SearchDocument', 'SearchDocument_sourceType_sourceId_key']");
  });

  test('exposes the source identity in the backend storage contract', () => {
    const types = readText(searchTypesPath);

    expect(types).toContain('sourceType: SearchSourceType');
    expect(types).toContain('sourceId: string');
    expect(types).not.toContain('pageId: string');
  });

  test('creates PostgreSQL search extensions and the immutable unaccent function', () => {
    const migration = readText(baselineMigrationPath);

    expect(migration).toContain("createExtension('unaccent')");
    expect(migration).toContain("createExtension('pg_trgm')");
    expect(migration).toContain('IMMUTABLE');
    expect(migration).toContain('public.immutable_unaccent');
  });

  test('creates the generated weighted vector and the fallback indexes', () => {
    const migration = readText(baselineMigrationPath);

    expect(migration).toContain('ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS');
    expect(migration).toContain("'A')");
    expect(migration).toContain("'B')");
    expect(migration).toContain('USING GIN ("searchVector")');
    expect(migration).toContain('USING GIN (public.immutable_unaccent("title") gin_trgm_ops)');
    expect(migration).toContain('USING GIN (public.immutable_unaccent("extractedText") gin_trgm_ops)');
  });

  test('exposes an explicit projection removal repository path', () => {
    const repository = readText(
      resolve(repositoryRoot, 'apps/backend/src/modules/search/infrastructure/persistence/search.repository.ts'),
    );

    expect(repository).toContain('async removeDocument');
    expect(repository).toContain('deleteAndCount');
  });
});
