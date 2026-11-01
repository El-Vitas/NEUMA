import { describe, expect, it } from 'bun:test';
import { listColumnsToRefresh, mergeLoadedCards } from '@/modules/pages/collections/lib/pages.board-paging.lib';
import { mergeCollectionLookups } from '@/modules/pages/collections/lib/pages.lookups.lib';
import type { PagesBoardLoaded } from '@/modules/pages/collections/types/pages.board-paging.types';
import type { PageRow, PageViewBand, PageViewGroup } from '@/modules/pages/collections/types/pages.schema.types';

const rowOf = (id: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: null,
  spaceId: 'space-1',
  title: id,
});

const column = (key: string, ids: readonly string[], nextCursor: null | string): PageViewGroup => ({
  color: null,
  key,
  label: key,
  nextCursor,
  rows: ids.map(rowOf),
});

const bandOf = (...groups: PageViewGroup[]): PageViewBand => ({ color: null, groups, key: '', label: '' });

const keyOf = (bandKey: string, groupKey: string): string => `${bandKey}|${groupKey}`;

const loadedOf = (rows: readonly PageRow[], cursor: null | string, drawnCursor: null | string): PagesBoardLoaded => ({
  cursor,
  drawnCursor,
  refreshFrom: null,
  rows,
});

describe('las tarjetas que una columna cargó después', () => {
  it('puts the cards a column loaded after the ones the server drew, and moves its cursor', () => {
    const drawn = column('todo', ['a', 'b'], 'cursor-1');

    const [band] = mergeLoadedCards([bandOf(drawn)], { '|todo': loadedOf([rowOf('c')], null, 'cursor-1') }, keyOf);

    expect(band?.groups[0]?.rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(band?.groups[0]?.nextCursor).toBeNull();
  });

  it('keeps what was loaded when the server draws the column differently, instead of folding it back', () => {
    const after = column('todo', ['b', 'a'], 'cursor-2');

    const [band] = mergeLoadedCards(
      [bandOf(after)],
      { '|todo': loadedOf([rowOf('c')], 'cursor-9', 'cursor-1') },
      keyOf,
    );

    expect(band?.groups[0]?.rows.map((row) => row.id)).toEqual(['b', 'a', 'c']);
    expect(band?.groups[0]?.nextCursor).toBe('cursor-9');
  });

  it('does not draw twice a card the server now draws', () => {
    const drawn = column('todo', ['a'], 'cursor-1');

    const [band] = mergeLoadedCards(
      [bandOf(drawn)],
      { '|todo': loadedOf([rowOf('a'), rowOf('b')], null, 'cursor-1') },
      keyOf,
    );

    expect(band?.groups[0]?.rows.map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('does not keep in a column a card the server now draws in another column of the same band', () => {
    const todo = column('todo', ['a'], 'cursor-1');
    const done = column('done', ['b'], null);

    const [band] = mergeLoadedCards(
      [bandOf(todo, done)],
      { '|todo': loadedOf([rowOf('b'), rowOf('c')], null, 'cursor-1') },
      keyOf,
    );

    expect(band?.groups[0]?.rows.map((row) => row.id)).toEqual(['a', 'c']);
  });

  it('adds nothing to a column the server now draws to its end, whatever it loaded before', () => {
    const [band] = mergeLoadedCards(
      [bandOf(column('todo', ['a', 'c'], null))],
      { '|todo': loadedOf([rowOf('c'), rowOf('d')], 'cursor-9', 'cursor-1') },
      keyOf,
    );

    expect(band?.groups[0]?.rows.map((row) => row.id)).toEqual(['a', 'c']);
    expect(band?.groups[0]?.nextCursor).toBeNull();
  });

  it('says which columns the server drew again while they held loaded cards', () => {
    const todo = column('todo', ['a'], 'cursor-2');
    const done = column('done', ['b'], 'cursor-5');

    const stale = listColumnsToRefresh(
      [bandOf(todo, done)],
      {
        '|done': loadedOf([rowOf('c')], null, 'cursor-5'),
        '|todo': loadedOf([rowOf('x')], null, 'cursor-1'),
      },
      keyOf,
    );

    expect(stale).toEqual([{ bandKey: '', drawnCursor: 'cursor-2', groupKey: 'todo' }]);
  });

  it('has nothing to read again in a column the server now draws to its end', () => {
    const todo = column('todo', ['a', 'x'], null);

    expect(listColumnsToRefresh([bandOf(todo)], { '|todo': loadedOf([rowOf('x')], null, 'cursor-1') }, keyOf)).toEqual(
      [],
    );
  });

  it('leaves alone the columns that loaded nothing', () => {
    const [band] = mergeLoadedCards([bandOf(column('todo', ['a'], null))], {}, keyOf);

    expect(band?.groups[0]?.rows.map((row) => row.id)).toEqual(['a']);
  });
});

describe('lo que necesitan las celdas de las filas cargadas', () => {
  it('keeps what was held and adds only what is new', () => {
    const held = {
      attachedFiles: [{ id: 'f1', mimeType: 'text/plain', name: 'a.txt', size: 1 }],
      people: [],
      relatedRows: [{ id: 'r1', title: 'One' }],
    };

    const merged = mergeCollectionLookups(held, {
      attachedFiles: [{ id: 'f1', mimeType: 'text/plain', name: 'a.txt', size: 1 }],
      relatedRows: [
        { id: 'r1', title: 'One' },
        { id: 'r2', title: 'Two' },
      ],
    });

    expect(merged.attachedFiles).toHaveLength(1);
    expect(merged.relatedRows.map((row) => row.id)).toEqual(['r1', 'r2']);
  });

  it('gives back the same lookups when there is nothing new to add', () => {
    const held = { attachedFiles: [], people: [], relatedRows: [{ id: 'r1', title: 'One' }] };

    const merged = mergeCollectionLookups(held, { attachedFiles: [], relatedRows: [{ id: 'r1', title: 'One' }] });

    expect(merged.relatedRows).toBe(held.relatedRows);
  });
});
