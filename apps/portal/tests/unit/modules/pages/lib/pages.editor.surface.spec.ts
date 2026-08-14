import { describe, expect, it } from 'bun:test';
import { readPageEditorMenuSpot } from '@/modules/pages/lib/pages.editor.surface.lib';

const surface = { left: 100, top: 50, width: 900 };

describe('where the menu of a block opens', () => {
  /** The menu belongs to the button that opened it, and that button stands level with the block's middle. */
  it('opens level with the buttons, however tall the block is', () => {
    expect(readPageEditorMenuSpot({ height: 400, left: 300, top: 250 }, surface)).toEqual({ left: 200, top: 400 });
  });

  it('opens beside a line of writing without wandering off it', () => {
    expect(readPageEditorMenuSpot({ height: 24, left: 300, top: 250 }, surface)).toEqual({ left: 200, top: 212 });
  });
});
