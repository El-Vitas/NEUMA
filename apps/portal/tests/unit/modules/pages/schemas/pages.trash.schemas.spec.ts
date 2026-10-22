import { describe, expect, it } from 'bun:test';
import {
  trashDescendantsPreviewSchema,
  trashEmptySchema,
  trashedPageSchema,
  trashedPagesListSchema,
  trashListQuerySchema,
  trashRestoreOutcomeSchema,
} from '@/modules/pages/trash/schemas/pages.trash.schemas';

describe('trashedPageSchema', () => {
  it('parses a trashed page carrying who deleted it and when', () => {
    const result = trashedPageSchema.safeParse({
      deletedAt: '2026-01-01T10:00:00.000Z',
      deletedBy: { id: 'user-a', name: 'Ada Lovelace' },
      id: 'page-a',
      parentId: null,
      purgeAfter: null,
      spaceId: 'space-a',
      title: 'Roadmap',
      trashedChildCount: 2,
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.deletedAt).toBeInstanceOf(Date);
    expect(result.success && result.data.isTemplate).toBe(false);
  });

  it('reads the day a page scheduled for deletion goes', () => {
    const result = trashedPageSchema.safeParse({
      deletedAt: '2026-01-01T10:00:00.000Z',
      deletedBy: null,
      id: 'page-a',
      parentId: null,
      purgeAfter: '2026-01-31T10:00:00.000Z',
      spaceId: 'space-a',
      title: 'Roadmap',
      trashedChildCount: 0,
    });

    expect(result.success && result.data.purgeAfter).toBeInstanceOf(Date);
  });

  it('accepts a null deletedBy for a page whose trasher no longer resolves', () => {
    const result = trashedPageSchema.safeParse({
      deletedAt: '2026-01-01T10:00:00.000Z',
      deletedBy: null,
      id: 'page-a',
      parentId: null,
      purgeAfter: null,
      spaceId: 'space-a',
      title: 'Roadmap',
      trashedChildCount: 0,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a trashed page missing its title', () => {
    const result = trashedPageSchema.safeParse({
      deletedAt: '2026-01-01T10:00:00.000Z',
      deletedBy: null,
      id: 'page-a',
      parentId: null,
      spaceId: 'space-a',
      trashedChildCount: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe('trashedPagesListSchema', () => {
  it('parses an empty trash', () => {
    expect(trashedPagesListSchema.safeParse({ items: [], total: 0 }).success).toBe(true);
  });

  it('carries how many pages the trash holds beyond the window shown', () => {
    const result = trashedPagesListSchema.safeParse({ items: [], total: 130 });

    expect(result.success && result.data.total).toBe(130);
  });

  it('refuses a list that is not a window', () => {
    expect(trashedPagesListSchema.safeParse([]).success).toBe(false);
  });
});

describe('trashDescendantsPreviewSchema', () => {
  it('parses a child page count', () => {
    expect(trashDescendantsPreviewSchema.safeParse({ childPageCount: 4 }).success).toBe(true);
  });
});

describe('trashRestoreOutcomeSchema', () => {
  it('parses a restore outcome', () => {
    expect(
      trashRestoreOutcomeSchema.safeParse({
        parentTitle: null,
        restoredChildCount: 1,
        restoredToRoot: true,
        spaceName: null,
      }).success,
    ).toBe(true);
  });

  it('parses the parent title and space name it also carries', () => {
    expect(
      trashRestoreOutcomeSchema.safeParse({
        parentTitle: 'Product',
        restoredChildCount: 0,
        restoredToRoot: false,
        spaceName: null,
      }).success,
    ).toBe(true);
  });
});

describe('trashListQuerySchema', () => {
  it('allows an empty query', () => {
    expect(trashListQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts an optional search and spaceId', () => {
    expect(trashListQuerySchema.safeParse({ search: 'roadmap', spaceId: 'space-a' }).success).toBe(true);
  });
});

describe('trashEmptySchema', () => {
  it('allows emptying every accessible space by omitting spaceId', () => {
    expect(trashEmptySchema.safeParse({}).success).toBe(true);
  });
});
