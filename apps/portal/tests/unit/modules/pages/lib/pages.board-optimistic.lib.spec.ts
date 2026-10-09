import { describe, expect, it } from 'bun:test';
import { applyBoardMoveToGroups } from '@/modules/pages/collections/lib/pages.board-drag.lib';
import type { PageRow, PageViewGroup } from '@/modules/pages/collections/types/pages.schema.types';

const row = (id: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection',
  propertyValues: { status: 'todo' },
  spaceId: 'space',
  title: id,
});

const groups: readonly PageViewGroup[] = [
  { color: null, key: 'todo', label: 'todo', rows: [row('a'), row('b'), row('c')] },
  { color: null, key: 'doing', label: 'doing', rows: [row('d')] },
];

const idsOf = (result: readonly PageViewGroup[], key: string): readonly string[] =>
  result.find((group) => group.key === key)?.rows.map((candidate) => candidate.id) ?? [];

describe('showing a move before the server has confirmed it', () => {
  it('takes the card out of the column it left and puts it where it was dropped', () => {
    const moved = applyBoardMoveToGroups(
      groups,
      'a',
      {
        beforeRowId: 'd',
        changesGroup: true,
        changesOrder: true,
        propertyValue: 'doing',
      },
      'status',
    );

    expect(idsOf(moved, 'todo')).toEqual(['b', 'c']);
    expect(idsOf(moved, 'doing')).toEqual(['a', 'd']);
  });

  it('puts it last when it was not dropped before any card', () => {
    const moved = applyBoardMoveToGroups(
      groups,
      'a',
      {
        beforeRowId: null,
        changesGroup: true,
        changesOrder: true,
        propertyValue: 'doing',
      },
      'status',
    );

    expect(idsOf(moved, 'doing')).toEqual(['d', 'a']);
  });

  it('reorders inside the same column', () => {
    const moved = applyBoardMoveToGroups(
      groups,
      'c',
      {
        beforeRowId: 'a',
        changesGroup: false,
        changesOrder: true,
        propertyValue: null,
      },
      'status',
    );

    expect(idsOf(moved, 'todo')).toEqual(['c', 'a', 'b']);
  });

  it('carries the value of the column it landed in', () => {
    const moved = applyBoardMoveToGroups(
      groups,
      'a',
      {
        beforeRowId: null,
        changesGroup: true,
        changesOrder: true,
        propertyValue: 'doing',
      },
      'status',
    );

    expect(moved.find((group) => group.key === 'doing')?.rows.at(-1)?.propertyValues).toEqual({ status: 'doing' });
  });

  it('says nothing about a card it does not know', () => {
    const moved = applyBoardMoveToGroups(
      groups,
      'missing',
      {
        beforeRowId: null,
        changesGroup: true,
        changesOrder: true,
        propertyValue: 'doing',
      },
      'status',
    );

    expect(moved).toEqual(groups);
  });
});
