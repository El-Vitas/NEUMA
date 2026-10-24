import { describe, expect, it } from 'bun:test';
import { PAGE_API_ROUTES } from '@/modules/pages/constants/pages.constants';
import {
  buildPageDocumentTitle,
  canEditPage,
  extractPageText,
  resolveReadOnlyMessage,
} from '@/modules/pages/lib/pages.lib';
import type { PageSummary } from '@/modules/pages/types/pages.types';

const page = (id: string, parentId: string | null, order: number): PageSummary => ({
  canEdit: true,
  content: {
    content: [{ content: [{ text: id, type: 'text' }], type: 'paragraph' }],
    schemaVersion: 1,
    type: 'doc',
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id,
  lifecycle: 'ACTIVE',
  order,
  parentId,
  propertyValues: null,
  spaceId: 'space-1',
  title: id,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  version: 1,
});

describe('pages.lib', () => {
  it('builds the workspace list endpoint with trashed pages enabled', () => {
    expect(PAGE_API_ROUTES.list('space-1', true)).toBe('/api/v1/spaces/space-1/pages?includeTrashed=true');
    expect(PAGE_API_ROUTES.restore('space-1', 'page-1')).toBe('/api/v1/spaces/space-1/pages/page-1/restore');
  });

  it('keeps trashed pages read-only while allowing active pages to be edited', () => {
    expect(canEditPage({ canEdit: true, lifecycle: 'ACTIVE' })).toBe(true);
    expect(canEditPage({ canEdit: true, lifecycle: 'TRASHED' })).toBe(false);
    expect(canEditPage({ canEdit: false, lifecycle: 'ACTIVE' })).toBe(false);
  });

  it('extracts searchable text from structured page content', () => {
    const summary = page('page-1', null, 1);

    expect(extractPageText(summary.content)).toBe('page-1');
  });

  it('joins multiple extracted blocks with a blank line', () => {
    const content: PageSummary['content'] = {
      content: [
        { content: [{ text: 'First', type: 'text' }], type: 'paragraph' },
        { attrs: { alt: 'Image metadata', assetId: 'asset-image' }, type: 'image' },
        { content: [{ text: 'Second', type: 'text' }], type: 'paragraph' },
      ],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(extractPageText(content)).toBe('First\n\nSecond');
  });
});

describe('what the editor says when it cannot be written in', () => {
  const say = (key: string): string => key;

  it('says the live channel is unavailable, whatever else holds', () => {
    expect(resolveReadOnlyMessage('ACTIVE', true, say, true)).toBe('blockSyncUnavailable');
    expect(resolveReadOnlyMessage('TRASHED', false, say, true)).toBe('blockSyncUnavailable');
  });

  it('keeps the other messages when the live channel works', () => {
    expect(resolveReadOnlyMessage('TRASHED', false, say)).toBe('trashReadOnly');
    expect(resolveReadOnlyMessage('ACTIVE', true, say)).toBe('lock.banner');
    expect(resolveReadOnlyMessage('ACTIVE', false, say)).toBe('readOnly');
  });
});

describe('what the browser tab says of a page', () => {
  it('puts the page name before the workspace name', () => {
    expect(buildPageDocumentTitle('Quarterly plan', 'Untitled')).toBe('Quarterly plan · Neuma');
  });

  it('falls back to the untitled label when nothing is written yet', () => {
    expect(buildPageDocumentTitle('   ', 'Untitled')).toBe('Untitled · Neuma');
  });
});
