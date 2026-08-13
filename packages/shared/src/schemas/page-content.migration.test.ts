import { describe, expect, test } from 'bun:test';
import { applyPageContentMigrations, readStoredPageContent } from './page-content.migration.js';
import type { PageContent } from './page-content.schema.js';
import { PAGE_CONTENT_SCHEMA_VERSION } from './page-content.schema.js';

const currentDocument: PageContent = {
  content: [{ content: [{ text: 'Roadmap', type: 'text' }], type: 'paragraph' }],
  schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
  type: 'doc',
};

describe('reading stored page content', () => {
  test('reads a document written by the current version', () => {
    expect(readStoredPageContent(currentDocument)).toEqual(currentDocument);
  });

  test('refuses a document written by a newer version than this build understands', () => {
    const futureDocument = { ...currentDocument, schemaVersion: PAGE_CONTENT_SCHEMA_VERSION + 1 };

    expect(readStoredPageContent(futureDocument)).toBeNull();
  });

  test('refuses an older document when no migration is registered for its version', () => {
    const legacyDocument = { ...currentDocument, schemaVersion: 0 };

    expect(readStoredPageContent(legacyDocument)).toBeNull();
  });

  test('refuses a document without a schema version', () => {
    expect(readStoredPageContent({ content: [], type: 'doc' })).toBeNull();
  });

  test('refuses a document whose content does not satisfy the schema', () => {
    expect(
      readStoredPageContent({ ...currentDocument, content: [{ attrs: { level: 9 }, type: 'heading' }] }),
    ).toBeNull();
  });

  test('reads a document holding a block this version does not know, which is kept rather than lost', () => {
    const withUnknown = { ...currentDocument, content: [{ attrs: { source: 'A-->B' }, type: 'diagram' }] };

    expect(readStoredPageContent(withUnknown)).toEqual(withUnknown);
  });

  test('refuses a value that is not a document', () => {
    expect(readStoredPageContent(null)).toBeNull();
    expect(readStoredPageContent(['doc'])).toBeNull();
  });
});

describe('applying page content migrations', () => {
  test('returns the document untouched when it already sits on the current version', () => {
    const document = { content: [], schemaVersion: PAGE_CONTENT_SCHEMA_VERSION, type: 'doc' };

    expect(applyPageContentMigrations(document, PAGE_CONTENT_SCHEMA_VERSION, {})).toEqual(document);
  });

  test('runs every registered step in order and stamps the resulting version', () => {
    const appliedSteps: number[] = [];
    const migrations = {
      [PAGE_CONTENT_SCHEMA_VERSION - 2]: (document: Readonly<Record<string, unknown>>) => {
        appliedSteps.push(PAGE_CONTENT_SCHEMA_VERSION - 2);
        return document;
      },
      [PAGE_CONTENT_SCHEMA_VERSION - 1]: (document: Readonly<Record<string, unknown>>) => {
        appliedSteps.push(PAGE_CONTENT_SCHEMA_VERSION - 1);
        return { ...document, type: 'doc' };
      },
    };

    const migrated = applyPageContentMigrations(
      { schemaVersion: PAGE_CONTENT_SCHEMA_VERSION - 2 },
      PAGE_CONTENT_SCHEMA_VERSION - 2,
      migrations,
    );

    expect(appliedSteps).toEqual([PAGE_CONTENT_SCHEMA_VERSION - 2, PAGE_CONTENT_SCHEMA_VERSION - 1]);
    expect(migrated).toEqual({ schemaVersion: PAGE_CONTENT_SCHEMA_VERSION, type: 'doc' });
  });

  test('stops and reports failure when a step is missing', () => {
    expect(applyPageContentMigrations({ schemaVersion: 0 }, 0, {})).toBeNull();
  });
});
