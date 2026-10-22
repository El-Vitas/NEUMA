import { describe, expect, it } from 'bun:test';
import { buildPanelLookups, withPanelDerivedValues } from '@/modules/pages/collections/lib/pages.panel-lookups.lib';
import { listRelationCandidatesToShow } from '@/modules/pages/collections/lib/pages.relations.lib';
import type { PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import { defaultConfig } from './pages.options.fixture';

const property = (key: string, type: PageSchemaProperty['type']): PageSchemaProperty => ({
  config: defaultConfig,
  key,
  label: key,
  options: null,
  required: false,
  type,
});

const page = (overrides: Partial<PageSummary>): PageSummary =>
  ({
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    createdBy: { id: 'user-a', name: 'Ada' },
    id: 'page-1',
    title: 'Page',
    updatedAt: new Date('2026-01-02T10:00:00.000Z'),
    updatedBy: { id: 'user-b', name: 'Grace' },
    ...overrides,
  }) as PageSummary;

describe('what a row page says about itself', () => {
  const properties = [
    property('made', 'CREATED_TIME'),
    property('madeBy', 'CREATED_BY'),
    property('edited', 'EDITED_TIME'),
    property('editedBy', 'EDITED_BY'),
  ];

  it('fills who made it and when from the page itself', () => {
    expect(withPanelDerivedValues(properties, {}, page({}))).toEqual({
      edited: { start: '2026-01-02T10:00:00.000Z' },
      editedBy: 'user-b',
      made: { start: '2026-01-01T10:00:00.000Z' },
      madeBy: 'user-a',
    });
  });

  it('leaves the values as they are when there is no page to read', () => {
    expect(withPanelDerivedValues(properties, { made: { start: 'x' } }, null)).toEqual({ made: { start: 'x' } });
  });
});

describe('what a row page already knows by name', () => {
  const properties = [property('related', 'RELATION'), property('notes', 'RICH_TEXT')];
  const pages = [
    { id: 'a', title: 'Alpha' },
    { id: 'b', title: 'Beta' },
    { id: 'c', title: 'Gamma' },
  ];

  it('names only the rows its relations point to', () => {
    const lookups = buildPanelLookups(properties, { related: ['a', 'c'] }, pages, [], []);

    expect(lookups.relatedRows).toEqual([
      { id: 'a', title: 'Alpha' },
      { id: 'c', title: 'Gamma' },
    ]);
  });

  it('names the files uploaded to the page', () => {
    const lookups = buildPanelLookups(
      properties,
      {},
      pages,
      [{ id: 'f1', mimeType: 'text/plain', originalFilename: 'notes.txt', size: 12, uploadedBy: 'user-a' }],
      [],
    );

    expect(lookups.attachedFiles).toEqual([{ id: 'f1', mimeType: 'text/plain', name: 'notes.txt', size: 12 }]);
  });
});

describe('listRelationCandidatesToShow', () => {
  const rows = [
    { id: 'a', title: 'Alpha' },
    { id: 'b', title: 'Beta' },
    { id: 'c', title: 'alphabet' },
  ];

  it('leaves out the rows already chosen', () => {
    expect(listRelationCandidatesToShow(rows, ['a'], '').map((row) => row.id)).toEqual(['b', 'c']);
  });

  it('narrows by what was typed, whatever the case', () => {
    expect(listRelationCandidatesToShow(rows, [], 'ALPHA').map((row) => row.id)).toEqual(['a', 'c']);
  });

  it('shows nothing before the rows have arrived', () => {
    expect(listRelationCandidatesToShow(null, [], '')).toEqual([]);
  });
});
