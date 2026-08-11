import { z } from 'zod';
import type { PageContent } from './page-content.schema.js';
import { PAGE_CONTENT_SCHEMA_VERSION, pageContentSchema } from './page-content.schema.js';

export type PageContentDocument = Readonly<Record<string, unknown>>;

export type PageContentMigration = (document: PageContentDocument) => PageContentDocument;

export type PageContentMigrations = Readonly<Record<number, PageContentMigration | undefined>>;

const PAGE_CONTENT_MIGRATIONS: PageContentMigrations = {};

const schemaVersionSchema = z.object({ schemaVersion: z.number().int().positive() });

const isPlainObject = (value: unknown): value is PageContentDocument =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readSchemaVersion = (value: unknown): number | null => {
  const parsed = schemaVersionSchema.safeParse(value);
  return parsed.success ? parsed.data.schemaVersion : null;
};

export const applyPageContentMigrations = (
  document: PageContentDocument,
  fromVersion: number,
  migrations: PageContentMigrations,
): PageContentDocument | null => {
  let migrated = document;
  for (let version = fromVersion; version < PAGE_CONTENT_SCHEMA_VERSION; version += 1) {
    const migration = migrations[version];
    if (migration === undefined) return null;
    migrated = { ...migration(migrated), schemaVersion: version + 1 };
  }
  return migrated;
};

export const readStoredPageContent = (value: unknown): PageContent | null => {
  const storedVersion = readSchemaVersion(value);
  if (storedVersion === null || storedVersion > PAGE_CONTENT_SCHEMA_VERSION || !isPlainObject(value)) return null;
  const migrated = applyPageContentMigrations(value, storedVersion, PAGE_CONTENT_MIGRATIONS);
  if (migrated === null) return null;
  const parsed = pageContentSchema.safeParse(migrated);
  return parsed.success ? parsed.data : null;
};
