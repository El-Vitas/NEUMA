import { describe, expect, it } from 'bun:test';
import { createBoardLiveController } from '@/modules/pages/collections/lib/pages.board-live.lib';
import type { BoardLiveOptions } from '@/modules/pages/collections/types/pages.board-live.types';
import type { BoardPlacementContext } from '@/modules/pages/collections/types/pages.board-placement.types';
import type { PageCollectionChanges } from '@/modules/pages/collections/types/pages.query.types';
import type { PageRow, PageSchemaProperty, PageViewBand } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';

const rowOf = (id: string, propertyValues: PageRow['propertyValues'] = null): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues,
  spaceId: 'space-1',
  title: id,
});

const properties: readonly PageSchemaProperty[] = [
  { config: defaultConfig, key: 'title', label: 'title', options: null, required: false, type: 'TITLE' },
  {
    config: defaultConfig,
    key: 'status',
    label: 'status',
    options: asPropertyOptions('todo', 'done'),
    required: false,
    type: 'SELECT',
  },
  { config: defaultConfig, key: 'points', label: 'points', options: null, required: false, type: 'NUMBER' },
];

const sortedContext: BoardPlacementContext = {
  filter: null,
  groupByKey: 'status',
  groupByMode: 'OPTION',
  hasSearch: false,
  hiddenGroups: [],
  now: Date.UTC(2026, 9, 21),
  properties,
  sorts: [{ direction: 'ASCENDING', propertyKey: 'points' }],
  subGroupByKey: '',
  timeZone: 'UTC',
  viewerId: null,
};

const column = (key: string, rows: readonly PageRow[]) => ({ color: null, key, label: key, nextCursor: null, rows });

const changesOf = (overrides: Partial<PageCollectionChanges>): PageCollectionChanges => ({
  attachedFiles: [],
  cursor: 'cursor-2',
  hasMore: false,
  isReset: false,
  possiblyChanged: [],
  possiblyChangedIsTruncated: false,
  relatedRows: [],
  rows: [],
  total: 0,
  trashedIds: [],
  ...overrides,
});

const createFixture = (overrides: Partial<BoardLiveOptions> = {}, context: BoardPlacementContext = sortedContext) => {
  let bands: readonly PageViewBand[] = [
    {
      color: null,
      groups: [
        column('todo', [rowOf('a', { points: 1, status: 'todo' })]),
        column('done', [rowOf('b', { points: 2, status: 'done' })]),
      ],
      key: '',
      label: '',
    },
  ];
  const calls = { cursors: [] as string[], countChanged: 0, lookups: 0, refreshes: [] as string[] };
  const controller = createBoardLiveController({
    applyBands: (next) => {
      bands = next;
    },
    coalesceMs: 0,
    initialCursor: 'cursor-1',
    onCountChanged: () => {
      calls.countChanged += 1;
    },
    onLookups: () => {
      calls.lookups += 1;
    },
    readBands: () => bands,
    readChanges: (cursor) => {
      calls.cursors.push(cursor);
      return Promise.resolve(changesOf({}));
    },
    readColumn: () => Promise.resolve(null),
    readContext: () => context,
    requestRefresh: (reason) => {
      calls.refreshes.push(reason);
    },
    ...overrides,
  });
  return { bands: () => bands, calls, controller };
};

const idsIn = (bands: readonly PageViewBand[], key: string) =>
  bands[0]?.groups.find((group) => group.key === key)?.rows.map((row) => row.id);

describe('createBoardLiveController', () => {
  it('moves a card to its new column without asking the server to draw the view again', async () => {
    const fixture = createFixture({
      readChanges: () => Promise.resolve(changesOf({ rows: [rowOf('a', { points: 1, status: 'done' })] })),
    });
    fixture.controller.notify([{ id: 'a', version: 5 }]);
    await fixture.controller.flush();
    expect(idsIn(fixture.bands(), 'todo')).toEqual([]);
    expect(idsIn(fixture.bands(), 'done')).toEqual(['a', 'b']);
    expect(fixture.calls.refreshes).toEqual([]);
    expect(fixture.calls.countChanged).toBe(1);
    expect(fixture.calls.lookups).toBe(1);
  });

  it('reads changes from the cursor and moves it forward', async () => {
    const fixture = createFixture();
    fixture.controller.notify([{ id: 'a', version: 2 }]);
    await fixture.controller.flush();
    fixture.controller.notify([{ id: 'a', version: 3 }]);
    await fixture.controller.flush();
    expect(fixture.calls.cursors).toEqual(['cursor-1', 'cursor-2']);
  });

  it('groups a burst of notices into one read', async () => {
    const fixture = createFixture();
    fixture.controller.notify([{ id: 'a', version: 2 }]);
    fixture.controller.notify([{ id: 'b', version: 2 }]);
    await fixture.controller.flush();
    expect(fixture.calls.cursors).toEqual(['cursor-1']);
  });

  it('ignores a notice for a version it already has', async () => {
    const fixture = createFixture();
    fixture.controller.notify([{ id: 'a', version: 4 }]);
    await fixture.controller.flush();
    fixture.controller.notify([{ id: 'a', version: 4 }]);
    fixture.controller.notify([{ id: 'a', version: 3 }]);
    await fixture.controller.flush();
    expect(fixture.calls.cursors).toEqual(['cursor-1']);
  });

  it('keeps reading while the server says there are more changes', async () => {
    const answers = [
      changesOf({ cursor: 'cursor-2', hasMore: true, rows: [rowOf('a', { points: 1, status: 'done' })] }),
      changesOf({ cursor: 'cursor-3', rows: [rowOf('b', { points: 2, status: 'todo' })] }),
    ];
    const fixture = createFixture({ readChanges: () => Promise.resolve(answers.shift() ?? null) });
    fixture.controller.notify([{ id: 'a', version: 2 }]);
    await fixture.controller.flush();
    expect(idsIn(fixture.bands(), 'done')).toEqual(['a']);
    expect(idsIn(fixture.bands(), 'todo')).toEqual(['b']);
  });

  it('asks the server to draw the view again when the cursor was reset', async () => {
    const fixture = createFixture({ readChanges: () => Promise.resolve(changesOf({ isReset: true })) });
    fixture.controller.notify([{ id: 'a', version: 2 }]);
    await fixture.controller.flush();
    expect(fixture.calls.refreshes).toEqual(['reset']);
  });

  it('asks the server to draw the view again when the changes could not be read', async () => {
    const fixture = createFixture({ readChanges: () => Promise.resolve(null) });
    fixture.controller.notify([{ id: 'a', version: 2 }]);
    await fixture.controller.flush();
    expect(fixture.calls.refreshes).toEqual(['changes-failed']);
  });

  it('asks the server to draw the view again for a case it cannot place, saying which', async () => {
    const fixture = createFixture(
      { readChanges: () => Promise.resolve(changesOf({ rows: [rowOf('a', { status: 'done' })] })) },
      { ...sortedContext, hasSearch: true },
    );
    fixture.controller.notify([{ id: 'a', version: 2 }]);
    await fixture.controller.flush();
    expect(fixture.calls.refreshes).toEqual(['search']);
  });

  it('reads the columns again that a manual order leaves open, and puts their cards in', async () => {
    const fixture = createFixture(
      {
        readChanges: () => Promise.resolve(changesOf({ rows: [rowOf('a', { status: 'done' })] })),
        readColumn: () =>
          Promise.resolve({ nextCursor: null, rows: [rowOf('b', { status: 'done' }), rowOf('a', { status: 'done' })] }),
      },
      { ...sortedContext, sorts: [] },
    );
    fixture.controller.notify([{ id: 'a', version: 2 }]);
    await fixture.controller.flush();
    expect(idsIn(fixture.bands(), 'done')).toEqual(['b', 'a']);
    expect(idsIn(fixture.bands(), 'todo')).toEqual([]);
  });

  it('asks the server to draw the view again when a column cannot be read', async () => {
    const fixture = createFixture(
      { readChanges: () => Promise.resolve(changesOf({ rows: [rowOf('a', { status: 'done' })] })) },
      { ...sortedContext, sorts: [] },
    );
    fixture.controller.notify([{ id: 'a', version: 2 }]);
    await fixture.controller.flush();
    expect(fixture.calls.refreshes).toEqual(['column-failed']);
  });

  it('starts from a new cursor after the server drew the view again', async () => {
    const fixture = createFixture();
    fixture.controller.reset('cursor-9');
    fixture.controller.notify([{ id: 'a', version: 2 }]);
    await fixture.controller.flush();
    expect(fixture.calls.cursors).toEqual(['cursor-9']);
  });

  it('does nothing after it is destroyed', async () => {
    const fixture = createFixture();
    fixture.controller.destroy();
    fixture.controller.notify([{ id: 'a', version: 2 }]);
    await fixture.controller.flush();
    expect(fixture.calls.cursors).toEqual([]);
  });
});
