import { describe, expect, it } from 'bun:test';
import { PAGE_BLOCK_COLORS } from '@neuma/shared';
import {
  PAGE_EDITOR_BACKGROUND_COLOR_CLASSES,
  PAGE_EDITOR_COLOR_SWATCH_CLASSES,
  PAGE_EDITOR_TEXT_COLOR_CLASSES,
} from '@/modules/pages/editor/text/constants/pages.editor.colors.constants';

const findRule = (rules: readonly string[], attribute: string, color: string): string | undefined =>
  rules.find((rule) => rule.includes(`[${attribute}=${color}]`));

describe('the palette a block can be painted with', () => {
  it('paints the text of every colour on offer, in a light and a dark reading', () => {
    for (const color of PAGE_BLOCK_COLORS) {
      const rule = findRule(PAGE_EDITOR_TEXT_COLOR_CLASSES, 'data-text-color', color);

      expect(rule).toBeDefined();
      expect(rule).toContain('dark:');
    }
  });

  it('paints the background of every colour on offer, in a light and a dark reading', () => {
    for (const color of PAGE_BLOCK_COLORS) {
      const rule = findRule(PAGE_EDITOR_BACKGROUND_COLOR_CLASSES, 'data-background-color', color);

      expect(rule).toBeDefined();
      expect(rule).toContain('dark:');
    }
  });

  it('shows every colour as itself in the menu', () => {
    for (const color of PAGE_BLOCK_COLORS) {
      expect(PAGE_EDITOR_COLOR_SWATCH_CLASSES[color]).toBeDefined();
    }
  });

  it('offers a palette short enough to read, not a colour picker', () => {
    expect(PAGE_BLOCK_COLORS.length).toBeLessThanOrEqual(10);
  });
});
