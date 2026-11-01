import { describe, expect, it } from 'bun:test';
import { applyBoardMoveToBands, resolveBoardGridDrop } from '@/modules/pages/collections/lib/pages.board-grid.lib';
import type { PageRow, PageViewBand } from '@/modules/pages/collections/types/pages.schema.types';

const row = (id: string, status: string, priority: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: { priority, status },
  spaceId: 'space-1',
  title: id,
});

const bands: readonly PageViewBand[] = [
  {
    color: null,
    groups: [
      { color: null, key: 'todo', label: 'todo', rows: [row('a', 'todo', 'high')] },
      { color: null, key: 'done', label: 'done', rows: [] },
    ],
    key: 'high',
    label: 'high',
  },
  {
    color: null,
    groups: [
      { color: null, key: 'todo', label: 'todo', rows: [] },
      { color: null, key: 'done', label: 'done', rows: [row('b', 'done', 'low')] },
    ],
    key: 'low',
    label: 'low',
  },
];

describe('resolveBoardGridDrop', () => {
  it('says nothing changed when the card is dropped on the crossing it already occupies', () => {
    expect(resolveBoardGridDrop(bands, 'a', { bandKey: 'high', beforeRowId: null, groupKey: 'todo' })).toBeNull();
  });

  it('writes only the column when the card stays in its band', () => {
    const move = resolveBoardGridDrop(bands, 'a', { bandKey: 'high', beforeRowId: null, groupKey: 'done' });

    expect(move).toEqual({
      bandValue: null,
      beforeRowId: null,
      changesBand: false,
      changesGroup: true,
      changesOrder: true,
      propertyValue: 'done',
    });
  });

  it('writes both properties when the card crosses into another band', () => {
    const move = resolveBoardGridDrop(bands, 'a', { bandKey: 'low', beforeRowId: null, groupKey: 'done' });

    expect(move).toEqual({
      bandValue: 'low',
      beforeRowId: null,
      changesBand: true,
      changesGroup: true,
      changesOrder: true,
      propertyValue: 'done',
    });
  });

  it('writes only the band when the card lands on the same column of another band', () => {
    const move = resolveBoardGridDrop(bands, 'a', { bandKey: 'low', beforeRowId: null, groupKey: 'todo' });

    expect(move?.changesBand).toBe(true);
    expect(move?.changesGroup).toBe(false);
    expect(move?.bandValue).toBe('low');
  });

  it('clears the property when the card lands on the band of rows without a value', () => {
    const withUnassigned: readonly PageViewBand[] = [
      ...bands,
      { color: null, groups: [{ color: null, key: 'todo', label: 'todo', rows: [] }], key: 'unassigned', label: 'Sin' },
    ];

    const move = resolveBoardGridDrop(withUnassigned, 'a', {
      bandKey: 'unassigned',
      beforeRowId: null,
      groupKey: 'todo',
    });

    expect(move?.changesBand).toBe(true);
    expect(move?.bandValue).toBeNull();
  });

  it('says nothing about a card that is nowhere in the grid', () => {
    expect(resolveBoardGridDrop(bands, 'nowhere', { bandKey: 'low', beforeRowId: null, groupKey: 'todo' })).toBeNull();
  });
});

describe('applyBoardMoveToBands', () => {
  it('draws the card in its new crossing before the server answers', () => {
    const moved = applyBoardMoveToBands(
      bands,
      'a',
      {
        bandValue: 'low',
        beforeRowId: null,
        changesBand: true,
        changesGroup: true,
        changesOrder: true,
        propertyValue: 'done',
      },
      'status',
      'priority',
    );

    expect(moved[0]?.groups[0]?.rows).toEqual([]);
    expect(moved[1]?.groups[1]?.rows.map((candidate) => candidate.id)).toEqual(['b', 'a']);
  });

  it('writes both values into the card it drew, so what it says matches where it sits', () => {
    const moved = applyBoardMoveToBands(
      bands,
      'a',
      {
        bandValue: 'low',
        beforeRowId: 'b',
        changesBand: true,
        changesGroup: true,
        changesOrder: true,
        propertyValue: 'done',
      },
      'status',
      'priority',
    );
    const landed = moved[1]?.groups[1]?.rows[0];

    expect(landed?.id).toBe('a');
    expect(landed?.propertyValues).toEqual({ priority: 'low', status: 'done' });
  });

  it('leaves the grid alone when the card is nowhere in it', () => {
    const move = {
      bandValue: null,
      beforeRowId: null,
      changesBand: false,
      changesGroup: false,
      changesOrder: true,
      propertyValue: null,
    };

    expect(applyBoardMoveToBands(bands, 'nowhere', move, 'status', 'priority')).toEqual(bands);
  });
});
