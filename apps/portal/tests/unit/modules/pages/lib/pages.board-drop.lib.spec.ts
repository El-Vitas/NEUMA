import { describe, expect, it } from 'bun:test';
import { readDropSideFromPointer, resolveBoardDrop } from '@/modules/pages/collections/lib/pages.board-drag.lib';
import type { PageRow, PageViewGroup } from '@/modules/pages/collections/types/pages.schema.types';

const row = (id: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection',
  propertyValues: {},
  spaceId: 'space',
  title: id,
});

const groups: readonly PageViewGroup[] = [
  { color: null, key: 'todo', label: 'todo', rows: [row('a'), row('b'), row('c')] },
  { color: null, key: 'doing', label: 'doing', rows: [row('d')] },
  { color: null, key: 'unassigned', label: 'Sin asignar', rows: [] },
];

describe('deciding what a drop does', () => {
  it('moves a card to another column, at the place it was dropped', () => {
    const move = resolveBoardDrop(groups, 'a', { beforeRowId: 'd', groupKey: 'doing' });

    expect(move).toEqual({ beforeRowId: 'd', changesGroup: true, changesOrder: true, propertyValue: 'doing' });
  });

  it('drops at the end of a column when it was not dropped before any card', () => {
    const move = resolveBoardDrop(groups, 'a', { beforeRowId: null, groupKey: 'doing' });

    expect(move).toEqual({ beforeRowId: null, changesGroup: true, changesOrder: true, propertyValue: 'doing' });
  });

  /** Landing in the column of rows without a value clears the property instead of writing a word. */
  it('clears the property when the card lands among the rows without a value', () => {
    const move = resolveBoardDrop(groups, 'a', { beforeRowId: null, groupKey: 'unassigned' });

    expect(move?.propertyValue).toBeNull();
  });

  it('reorders within the same column without touching the property', () => {
    const move = resolveBoardDrop(groups, 'c', { beforeRowId: 'a', groupKey: 'todo' });

    expect(move).toEqual({ beforeRowId: 'a', changesGroup: false, changesOrder: true, propertyValue: null });
  });

  /** A card dropped onto itself has not moved. */
  it('does nothing when a card is dropped on itself', () => {
    expect(resolveBoardDrop(groups, 'b', { beforeRowId: 'b', groupKey: 'todo' })).toBeNull();
  });

  /**
   * Dropping a card just before the one that already follows it leaves it
   * exactly where it was: the gap it was dropped into is the gap it came from.
   */
  it('does nothing when the gap it was dropped into is the one it already occupied', () => {
    expect(resolveBoardDrop(groups, 'a', { beforeRowId: 'b', groupKey: 'todo' })).toBeNull();
  });

  it('does nothing when the last card of a column is dropped at the end of that column', () => {
    expect(resolveBoardDrop(groups, 'c', { beforeRowId: null, groupKey: 'todo' })).toBeNull();
  });

  it('says nothing about a card that is in no column it knows', () => {
    expect(resolveBoardDrop(groups, 'missing', { beforeRowId: null, groupKey: 'todo' })).toBeNull();
  });
});

describe('reading which gap the pointer is over', () => {
  /** Above the middle of a card means the gap before it; below means the gap after. */
  it('reads the upper half of a card as the gap before it', () => {
    expect(readDropSideFromPointer(120, { height: 100, top: 100 })).toBe('BEFORE');
  });

  it('reads the lower half of a card as the gap after it', () => {
    expect(readDropSideFromPointer(180, { height: 100, top: 100 })).toBe('AFTER');
  });

  it('reads the exact middle as the gap after it, so the card does not flicker between two answers', () => {
    expect(readDropSideFromPointer(150, { height: 100, top: 100 })).toBe('AFTER');
  });
});
