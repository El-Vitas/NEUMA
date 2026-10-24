import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Result } from '@neuma/shared';

const asked: { readonly kind: string; readonly limit: number }[] = [];

const queryPageView = mock(
  async (
    _spaceId: string,
    _pageId: string,
    body: { reducers: { readonly kind: string; readonly limit: number }[] },
  ) => {
    asked.push(...body.reducers);
    return Result.ok({
      attachedFiles: [],
      changesCursor: 'cursor',
      reducers: { rows: { ids: [], kind: 'results', nextCursor: null } },
      relatedRows: [],
      rows: {},
      spaceId: 'space-1',
    });
  },
);

mock.module('server-only', () => ({}));
mock.module('@/modules/pages/collections/server/queries/pages.schema.queries', () => ({ queryPageView }));

const { readRowsInScope } = await import('@/modules/pages/collections/server/lib/pages.rows-reading.server');

const input = { pageId: 'page-1', quickFilter: null, search: '', spaceId: 'space-1', viewId: 'view-1' };

describe('readRowsInScope', () => {
  beforeEach(() => {
    asked.length = 0;
  });

  it('asks for a large window in as few reads as the backend allows, not a hundred rows at a time', async () => {
    await readRowsInScope({ ...input, wanted: 2000 });

    expect(asked).toEqual([expect.objectContaining({ kind: 'results', limit: 1000 })]);
  });

  it('keeps the smaller page for one group of a grouped view, which the backend caps at a hundred', async () => {
    await readRowsInScope({ ...input, group: { key: 'todo' }, wanted: 2000 });

    expect(asked).toEqual([expect.objectContaining({ kind: 'groupResults', limit: 100 })]);
  });

  it('never asks for more rows than are still missing', async () => {
    await readRowsInScope({ ...input, wanted: 100 });

    expect(asked).toEqual([expect.objectContaining({ limit: 100 })]);
  });
});
