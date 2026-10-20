import { describe, expect, it } from 'bun:test';
import {
  areSnapshotMapsEqual,
  findChildrenDivergence,
  overlaySnapshots,
} from '@/modules/pages/block-sync/lib/block-sync.rows.lib';
import type { BlockSnapshot, BlockSnapshotMap } from '@/modules/pages/block-sync/types/block-sync.types';

const block = (id: string, children: readonly string[] = []): BlockSnapshot => ({
  children,
  format: {},
  id,
  parentId: id === 'page' ? null : 'page',
  properties: {},
  type: id === 'page' ? 'page' : 'paragraph',
});

const mapOf = (...blocks: readonly BlockSnapshot[]): BlockSnapshotMap =>
  new Map(blocks.map((entry) => [entry.id, entry]));

describe('overlaySnapshots', () => {
  it('takes the blocks of the writer where the writer is working', () => {
    const known = mapOf(block('page', ['a']), block('a'));
    const local = mapOf(block('page', ['a']), block('a', []), block('n'));

    const merged = overlaySnapshots(known, local, new Set(['n']), () => false);

    expect(merged.has('n')).toBe(true);
  });

  it('keeps a sibling someone else added to a list the writer is changing', () => {
    const known = mapOf(block('page', ['a', 'remote', 'b']), block('a'), block('remote'), block('b'));
    const local = mapOf(block('page', ['a', 'b', 'n']), block('a'), block('b'), block('n'));

    const merged = overlaySnapshots(known, local, new Set(['page', 'n']), () => false);

    expect(merged.get('page')?.children).toEqual(['a', 'remote', 'b', 'n']);
  });

  it('does not bring back a sibling the writer deleted', () => {
    const known = mapOf(block('page', ['a', 'gone']), block('a'), block('gone'));
    const local = mapOf(block('page', ['a']), block('a'));

    const merged = overlaySnapshots(known, local, new Set(['page', 'gone']), (blockId) => blockId === 'gone');

    expect(merged.get('page')?.children).toEqual(['a']);
    expect(merged.has('gone')).toBe(false);
  });
});

describe('findChildrenDivergence', () => {
  it('finds nothing when the server lists the blocks in the order they were written', () => {
    expect(findChildrenDivergence(['a', 'b', 'c'], ['a', 'b', 'c'], new Set(['b']))).toBe(false);
  });

  it('ignores a block someone else added', () => {
    expect(findChildrenDivergence(['a', 'remote', 'b'], ['a', 'b'], new Set())).toBe(false);
  });

  it('finds a block the server put at the end when it was written in the middle', () => {
    expect(findChildrenDivergence(['a', 'b', 'x'], ['a', 'x', 'b'], new Set(['x']))).toBe(true);
  });

  it('finds a block that was listed and is not on the server', () => {
    expect(findChildrenDivergence(['a', 'b'], ['a', 'x', 'b'], new Set(['x']))).toBe(true);
  });

  it('does not mind a block the server lacks when it was not one this client just listed', () => {
    expect(findChildrenDivergence(['a', 'b'], ['a', 'old', 'b'], new Set())).toBe(false);
  });
});

describe('areSnapshotMapsEqual', () => {
  it('compares what the blocks say', () => {
    expect(areSnapshotMapsEqual(mapOf(block('a')), mapOf(block('a')))).toBe(true);
    expect(areSnapshotMapsEqual(mapOf(block('a')), mapOf(block('b')))).toBe(false);
  });
});
