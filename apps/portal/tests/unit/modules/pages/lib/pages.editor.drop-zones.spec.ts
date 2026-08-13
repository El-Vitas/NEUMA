import { describe, expect, it } from 'bun:test';
import {
  findPageEditorColumnSide,
  isPointerAtPageEditorBlockEdge,
} from '@/modules/pages/lib/pages.editor.block-columns.lib';

const block = { height: 100, left: 200, top: 400, width: 600 };

describe('where a dragged block is aiming', () => {
  it('reads the top of a block as a new line above it', () => {
    expect(isPointerAtPageEditorBlockEdge({ blockRect: block, clientY: 405 })).toBe(true);
  });

  it('reads the bottom of a block as a new line below it', () => {
    expect(isPointerAtPageEditorBlockEdge({ blockRect: block, clientY: 495 })).toBe(true);
  });

  it('leaves the middle to the sides, which is where a column is made', () => {
    expect(isPointerAtPageEditorBlockEdge({ blockRect: block, clientY: 450 })).toBe(false);
  });

  it('still offers both edges on a block only one line tall', () => {
    const thin = { height: 24, left: 200, top: 400, width: 600 };

    expect(isPointerAtPageEditorBlockEdge({ blockRect: thin, clientY: 401 })).toBe(true);
    expect(isPointerAtPageEditorBlockEdge({ blockRect: thin, clientY: 423 })).toBe(true);
    expect(isPointerAtPageEditorBlockEdge({ blockRect: thin, clientY: 412 })).toBe(false);
  });
});

describe('which side of a block a column would be made on', () => {
  it('answers the left and the right alike, so neither is easier to reach', () => {
    const fromLeft = findPageEditorColumnSide({ blockRect: block, clientX: 210 });
    const fromRight = findPageEditorColumnSide({ blockRect: block, clientX: 790 });

    expect(fromLeft).toBe('left');
    expect(fromRight).toBe('right');
  });

  it('says nothing in the middle, which belongs to moving between blocks', () => {
    expect(findPageEditorColumnSide({ blockRect: block, clientX: 500 })).toBeNull();
  });

  it('still answers just outside the block, where a drag starts from', () => {
    expect(findPageEditorColumnSide({ blockRect: block, clientX: 180 })).toBe('left');
    expect(findPageEditorColumnSide({ blockRect: block, clientX: 820 })).toBe('right');
  });

  it('says nothing far away from the block', () => {
    expect(findPageEditorColumnSide({ blockRect: block, clientX: 40 })).toBeNull();
    expect(findPageEditorColumnSide({ blockRect: block, clientX: 1200 })).toBeNull();
  });

  it('offers both sides on a block too narrow to have a middle', () => {
    const narrow = { height: 40, left: 500, top: 0, width: 60 };

    expect(findPageEditorColumnSide({ blockRect: narrow, clientX: 510 })).toBe('left');
    expect(findPageEditorColumnSide({ blockRect: narrow, clientX: 550 })).toBe('right');
  });
});
