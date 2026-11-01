import { describe, expect, it } from 'bun:test';
import { findStaleBlock } from '@/modules/blocks/domain/block.version.domain';
import { buildBlock } from '../block.test-data';

describe('findStaleBlock', () => {
  const locked = [buildBlock({ id: 'a', version: 3 }), buildBlock({ id: 'b', version: 7 })];

  it('answers nothing when every expected version is the one the block has', () => {
    expect(
      findStaleBlock(
        [
          { blockId: 'a', version: 3 },
          { blockId: 'b', version: 7 },
        ],
        locked,
      ),
    ).toBeNull();
  });

  it('names the first block that moved on', () => {
    expect(
      findStaleBlock(
        [
          { blockId: 'a', version: 3 },
          { blockId: 'b', version: 6 },
        ],
        locked,
      ),
    ).toBe('b');
  });

  it('answers nothing when no version is expected, and names a block that is not held', () => {
    expect(findStaleBlock(undefined, locked)).toBeNull();
    expect(findStaleBlock([{ blockId: 'ghost', version: 1 }], locked)).toBe('ghost');
  });
});
