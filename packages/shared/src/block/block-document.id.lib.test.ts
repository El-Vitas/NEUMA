import { describe, expect, test } from 'bun:test';
import { pageBlockIdSchema } from '../schemas/page-content.schema.js';
import { deriveBlockId } from './block-document.id.lib.js';

const PAGE_ID = '0192f3a0-0000-7000-8000-000000000001';
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('deriveBlockId', () => {
  test('gives the same id for the same page and path', () => {
    expect(deriveBlockId(PAGE_ID, [0, 3, 1])).toBe(deriveBlockId(PAGE_ID, [0, 3, 1]));
  });

  test('gives another id to another path', () => {
    expect(deriveBlockId(PAGE_ID, [0, 3, 1])).not.toBe(deriveBlockId(PAGE_ID, [0, 3, 2]));
    expect(deriveBlockId(PAGE_ID, [1, 0])).not.toBe(deriveBlockId(PAGE_ID, [10]));
  });

  test('gives another id to another page', () => {
    expect(deriveBlockId(PAGE_ID, [0])).not.toBe(deriveBlockId('0192f3a0-0000-7000-8000-000000000009', [0]));
  });

  test('has the shape of a UUID and fits a block id', () => {
    const id = deriveBlockId(PAGE_ID, [4, 2]);

    expect(id).toMatch(UUID_SHAPE);
    expect(pageBlockIdSchema.safeParse(id).success).toBe(true);
  });

  test('does not repeat across a thousand paths', () => {
    const ids = Array.from({ length: 1000 }, (_, index) =>
      deriveBlockId(PAGE_ID, [Math.floor(index / 10), index % 10]),
    );

    expect(new Set(ids).size).toBe(1000);
  });

  test('is stable: this id never changes between releases', () => {
    expect(deriveBlockId(PAGE_ID, [0])).toBe('cd2480c4-9aef-805b-822f-803a9c3ea116');
  });
});
