import { describe, expect, it } from 'bun:test';
import {
  PAGE_APPEARANCE_DEFAULT_PREFERENCES,
  PAGE_APPEARANCE_SECTION_PADDING_STYLE_CLASS,
  PAGE_APPEARANCE_WIDTH_STYLE_CLASS,
} from '@/modules/pages/constants/pages.appearance.constants';
import {
  PAGE_OUTLINE_LAYOUT_STYLE_CLASS,
  PAGE_OUTLINE_SIDE_STYLE_CLASS,
} from '@/modules/pages/constants/pages.editor.contents.constants';
import {
  buildPageAppearanceStorageKey,
  getPageAppearanceLayoutStyleClasses,
  isPageAppearanceTextSize,
  isPageAppearanceTypography,
  parsePageAppearancePreferences,
  serializePageAppearancePreferences,
} from '@/modules/pages/lib/pages.appearance.lib';
import type { PageAppearancePreferences } from '@/modules/pages/types/pages.appearance.types';

describe('pages.appearance.lib', () => {
  describe('buildPageAppearanceStorageKey', () => {
    it('scopes the key to the page it was chosen for', () => {
      expect(buildPageAppearanceStorageKey('page-1')).toContain('page-1');
      expect(buildPageAppearanceStorageKey('page-1')).not.toBe(buildPageAppearanceStorageKey('page-2'));
    });

    it('falls back to a shared scope for a page that has no id yet', () => {
      expect(buildPageAppearanceStorageKey(null)).toContain('new');
    });
  });

  describe('isPageAppearanceTextSize', () => {
    it('accepts every text size this product offers', () => {
      expect(isPageAppearanceTextSize('small')).toBe(true);
      expect(isPageAppearanceTextSize('normal')).toBe(true);
      expect(isPageAppearanceTextSize('large')).toBe(true);
    });

    it('refuses anything else', () => {
      expect(isPageAppearanceTextSize('huge')).toBe(false);
      expect(isPageAppearanceTextSize(3)).toBe(false);
    });
  });

  describe('isPageAppearanceTypography', () => {
    it('accepts every typeface this product offers', () => {
      expect(isPageAppearanceTypography('system')).toBe(true);
      expect(isPageAppearanceTypography('serif')).toBe(true);
      expect(isPageAppearanceTypography('monospace')).toBe(true);
    });

    it('refuses anything else', () => {
      expect(isPageAppearanceTypography('comic-sans')).toBe(false);
    });
  });

  describe('parsePageAppearancePreferences', () => {
    it('falls back to the default when nothing was ever chosen', () => {
      expect(parsePageAppearancePreferences(null)).toEqual(PAGE_APPEARANCE_DEFAULT_PREFERENCES);
    });

    it('falls back to the default when what is stored cannot be read as JSON', () => {
      expect(parsePageAppearancePreferences('not json')).toEqual(PAGE_APPEARANCE_DEFAULT_PREFERENCES);
    });

    it('falls back to the default when what is stored is not a real preference', () => {
      const incomplete = JSON.stringify({ typography: 'system' });
      const wrongShape = JSON.stringify({ textSize: 'enormous', typography: 'system' });

      expect(parsePageAppearancePreferences(incomplete)).toEqual(PAGE_APPEARANCE_DEFAULT_PREFERENCES);
      expect(parsePageAppearancePreferences(wrongShape)).toEqual(PAGE_APPEARANCE_DEFAULT_PREFERENCES);
    });

    it('reads back exactly what was chosen', () => {
      const chosen: PageAppearancePreferences = { textSize: 'large', typography: 'serif' };
      expect(parsePageAppearancePreferences(serializePageAppearancePreferences(chosen))).toEqual(chosen);
    });

    it('keeps the choices still offered when what was stored also remembered a width', () => {
      const storedBeforeTheWidthWasDropped = JSON.stringify({
        fullWidth: true,
        textSize: 'large',
        typography: 'serif',
      });

      expect(parsePageAppearancePreferences(storedBeforeTheWidthWasDropped)).toEqual({
        textSize: 'large',
        typography: 'serif',
      });
    });
  });

  describe('getPageAppearanceLayoutStyleClasses', () => {
    it('never holds a page to a narrower column than the room it was given', () => {
      expect(getPageAppearanceLayoutStyleClasses().width).toBe(PAGE_APPEARANCE_WIDTH_STYLE_CLASS);
      expect(PAGE_APPEARANCE_WIDTH_STYLE_CLASS).toBe('max-w-none');
    });

    it('keeps the outline in its own reserved column, so it never rests on top of anything', () => {
      const layout = getPageAppearanceLayoutStyleClasses();

      expect(layout.outlineLayout).toBe(PAGE_OUTLINE_LAYOUT_STYLE_CLASS);
      expect(layout.outlineSide).toBe(PAGE_OUTLINE_SIDE_STYLE_CLASS);
      expect(layout.sectionPadding).toBe(PAGE_APPEARANCE_SECTION_PADDING_STYLE_CLASS);
    });
  });
});
