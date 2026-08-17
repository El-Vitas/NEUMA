import { describe, expect, it } from 'bun:test';
import {
  trashDescendantsPreviewSchema,
  trashEmptySchema,
  trashedPageSchema,
  trashedPagesListSchema,
  trashListQuerySchema,
  trashRestoreOutcomeSchema,
} from '@/modules/pages/schemas/pages.trash.schemas';

describe('trashedPageSchema', () => {
  it('parses a trashed page carrying who deleted it and when', () => {
    const result = trashedPageSchema.safeParse({
      deletedAt: '2026-01-01T10:00:00.000Z',
      deletedBy: { id: 'user-a', name: 'Ada Lovelace' },
      id: 'page-a',
      parentId: null,
      spaceId: 'space-a',
      title: 'Roadmap',
      trashedChildCount: 2,
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.deletedAt).toBeInstanceOf(Date);
  });

  it('accepts a null deletedBy for a page whose trasher no longer resolves', () => {
    const result = trashedPageSchema.safeParse({
      deletedAt: '2026-01-01T10:00:00.000Z',
      deletedBy: null,
      id: 'page-a',
      parentId: null,
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
    expect(trashedPagesListSchema.safeParse([]).success).toBe(true);
  });
});

describe('trashDescendantsPreviewSchema', () => {
  it('parses a child page count', () => {
    expect(trashDescendantsPreviewSchema.safeParse({ childPageCount: 4 }).success).toBe(true);
  });
});

describe('trashRestoreOutcomeSchema', () => {
  it('parses a restore outcome', () => {
    expect(trashRestoreOutcomeSchema.safeParse({ restoredChildCount: 1, restoredToRoot: true }).success).toBe(true);
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
