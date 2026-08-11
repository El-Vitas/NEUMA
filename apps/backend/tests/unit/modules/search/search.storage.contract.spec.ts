import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(process.cwd(), '../..');
const modelPath = resolve(repositoryRoot, 'packages/db/prisma/models/search-document.model.prisma');
const sourceTypeEnumPath = resolve(repositoryRoot, 'packages/db/prisma/enums/search-source-type.enum.prisma');
const searchTypesPath = resolve(repositoryRoot, 'apps/backend/src/modules/search/types/search.types.ts');
const migrationDirectory = resolve(repositoryRoot, 'packages/db/prisma/migrations');

const readText = (path: string): string => readFileSync(path, 'utf8');

const findSearchStorageMigration = (): string => {
  const migrationName = readFileSync(resolve(migrationDirectory, 'migration_lock.toml'), 'utf8');
  expect(migrationName).toContain('provider = "postgresql"');

  const migrationDirectories = readFileSync(
    resolve(migrationDirectory, '20260801233000_company_brain_foundation/migration.sql'),
    'utf8',
  );
  expect(migrationDirectories).toContain('CREATE TABLE "SearchDocument"');

  return readText(resolve(migrationDirectory, '20260802020000_search_storage_foundation/migration.sql'));
};

describe('search storage contract', () => {
  test('models a document by source type and source id', () => {
    const model = readText(modelPath);

    expect(model).toContain('sourceType    SearchSourceType');
    expect(model).toContain('sourceId      String');
    expect(model).toContain('@@unique([sourceType, sourceId])');
    expect(model).not.toContain('pageId');
    expect(model).toContain('searchVector  Unsupported("tsvector")');
  });

  test('defines the bilingual language contract and source type enum', () => {
    const model = readText(modelPath);
    const types = readText(searchTypesPath);

    expect(model).toContain('language      String?');
    expect(types).toContain("export type SearchLanguage = 'en' | 'es';");
    expect(readText(sourceTypeEnumPath)).toContain('PAGE');
  });

  test('exposes the source identity in the backend storage contract', () => {
    const types = readText(searchTypesPath);

    expect(types).toContain('sourceType: SearchSourceType');
    expect(types).toContain('sourceId: string');
    expect(types).not.toContain('pageId: string');
  });

  test('creates PostgreSQL search extensions, generated vector, and fallback indexes', () => {
    const migration = findSearchStorageMigration();

    expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS "unaccent"');
    expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    expect(migration).toContain('IMMUTABLE');
    expect(migration).toContain('public.immutable_unaccent');
    expect(migration).toContain('ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS');
    expect(migration).toContain('USING GIN ("searchVector")');
    expect(migration).toContain('USING GIN ("title" gin_trgm_ops, "extractedText" gin_trgm_ops)');
  });

  test('exposes an explicit projection removal repository path', () => {
    const repository = readText(
      resolve(repositoryRoot, 'apps/backend/src/modules/search/infrastructure/persistence/search.repository.ts'),
    );

    expect(repository).toContain('async removeDocument');
    expect(repository).toContain('deleteMany');
  });
});
