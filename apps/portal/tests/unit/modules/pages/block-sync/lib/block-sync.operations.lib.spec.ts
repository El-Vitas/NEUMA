import { describe, expect, it } from 'bun:test';
import {
  buildApplyTextOperation,
  buildListInsertOperation,
  buildListRemoveOperation,
  buildSetOperation,
  buildUpdateOperation,
  chunkOperationGroups,
  countOperationsByBlock,
  listCreatedOrRevivedIds,
  listTouchedBlockIds,
} from '@/modules/pages/block-sync/lib/block-sync.operations.lib';

describe('operation builders', () => {
  it('addresses the block table by pointer', () => {
    const operation = buildSetOperation('b1', { id: 'b1', parentId: 'p', type: 'paragraph' });

    expect(operation).toEqual({
      args: { id: 'b1', parentId: 'p', type: 'paragraph' },
      command: 'set',
      path: [],
      pointer: { id: 'b1', table: 'block' },
    });
  });

  it('updates a bag by path', () => {
    expect(buildUpdateOperation('b1', ['properties'], { level: 2 })).toMatchObject({
      command: 'update',
      path: ['properties'],
    });
  });

  it('lists a child after an anchor, or at the end when there is no anchor', () => {
    expect(buildListInsertOperation('parent', { after: 'x', childId: 'c' })).toMatchObject({
      args: { after: 'x', id: 'c' },
      command: 'listAfter',
      path: ['children'],
      pointer: { id: 'parent' },
    });
    expect(buildListInsertOperation('parent', { childId: 'c' })).toMatchObject({
      args: { id: 'c' },
      command: 'listAfter',
    });
  });

  it('lists a child before an anchor', () => {
    expect(buildListInsertOperation('parent', { before: 'x', childId: 'c' })).toMatchObject({
      args: { before: 'x', id: 'c' },
      command: 'listBefore',
    });
  });

  it('removes a child from a list', () => {
    expect(buildListRemoveOperation('parent', 'c')).toMatchObject({ args: { id: 'c' }, command: 'listRemove' });
  });

  it('carries a text update as applyText', () => {
    expect(buildApplyTextOperation('b1', 'title', 'AAAA')).toMatchObject({
      args: { property: 'title', update: 'AAAA' },
      command: 'applyText',
    });
  });
});

describe('chunkOperationGroups', () => {
  const group = (size: number, blockId: string) =>
    Array.from({ length: size }, () => buildUpdateOperation(blockId, [], { alive: false }));

  it('keeps everything in one transaction while it fits', () => {
    expect(chunkOperationGroups([group(2, 'a'), group(3, 'b')], 10)).toHaveLength(1);
  });

  it('starts a new transaction between groups, never inside one', () => {
    const chunks = chunkOperationGroups([group(3, 'a'), group(3, 'b'), group(3, 'c')], 7);

    expect(chunks.map((chunk) => chunk.length)).toEqual([6, 3]);
  });

  it('gives a group larger than the limit its own transaction rather than dropping it', () => {
    const chunks = chunkOperationGroups([group(2, 'a'), group(12, 'b'), group(1, 'c')], 10);

    expect(chunks.map((chunk) => chunk.length)).toEqual([2, 12, 1]);
  });

  it('returns nothing for no groups', () => {
    expect(chunkOperationGroups([], 10)).toEqual([]);
  });
});

describe('listTouchedBlockIds', () => {
  it('names the pointers and every block an argument refers to', () => {
    const touched = listTouchedBlockIds([
      buildSetOperation('n', { id: 'n', parentId: 'p', type: 'paragraph' }),
      buildListInsertOperation('p', { after: 'x', childId: 'n' }),
      buildListRemoveOperation('old', 'm'),
      buildUpdateOperation('m', [], { parentId: 'p' }),
    ]);

    expect([...touched].toSorted()).toEqual(['m', 'n', 'old', 'p', 'x']);
  });
});

describe('listing a child at the start', () => {
  it('lists it before nothing, which the server reads as the start of the list', () => {
    expect(buildListInsertOperation('parent', { atStart: true, childId: 'c' })).toMatchObject({
      args: { id: 'c' },
      command: 'listBefore',
      path: ['children'],
    });
  });
});

describe('listCreatedOrRevivedIds', () => {
  it('names the blocks a set creates and an update brings back, not the ones it only changes', () => {
    const ids = listCreatedOrRevivedIds([
      buildSetOperation('made', { id: 'made' }),
      buildUpdateOperation('back', [], { alive: true, parentId: 'p' }),
      buildUpdateOperation('gone', [], { alive: false }),
      buildUpdateOperation('changed', ['properties'], { level: 2 }),
      buildListInsertOperation('p', { childId: 'made' }),
    ]);

    expect([...ids].toSorted()).toEqual(['back', 'made']);
  });
});

describe('countOperationsByBlock', () => {
  it('counts the operations whose pointer is each block', () => {
    const counts = countOperationsByBlock([
      buildSetOperation('n', { id: 'n' }),
      buildApplyTextOperation('n', 'title', 'AA'),
      buildListInsertOperation('p', { childId: 'n' }),
    ]);

    expect(counts.get('n')).toBe(2);
    expect(counts.get('p')).toBe(1);
  });
});
