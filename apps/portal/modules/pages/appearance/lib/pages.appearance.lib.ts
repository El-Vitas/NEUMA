import { isOneOf } from '@company-brain/shared';
import { readJsonSafely } from '@/shared/lib/json.lib';
import {
  PAGE_OUTLINE_LAYOUT_STYLE_CLASS,
  PAGE_OUTLINE_SIDE_STYLE_CLASS,
} from '../../editor/structure/constants/pages.editor.contents.constants';
import {
  PAGE_APPEARANCE_DEFAULT_PREFERENCES,
  PAGE_APPEARANCE_NEW_PAGE_STORAGE_SCOPE,
  PAGE_APPEARANCE_SECTION_PADDING_STYLE_CLASS,
  PAGE_APPEARANCE_STORAGE_KEY_PREFIX,
  PAGE_APPEARANCE_TEXT_SIZE_VALUES,
  PAGE_APPEARANCE_TYPOGRAPHY_VALUES,
  PAGE_APPEARANCE_WIDTH_STYLE_CLASS,
} from '../constants/pages.appearance.constants';
import type {
  PageAppearanceLayoutStyleClasses,
  PageAppearancePreferences,
  PageAppearanceTextSize,
  PageAppearanceTypography,
} from '../types/pages.appearance.types';

export const buildPageAppearanceStorageKey = (pageId: string | null): string =>
  `${PAGE_APPEARANCE_STORAGE_KEY_PREFIX}${pageId ?? PAGE_APPEARANCE_NEW_PAGE_STORAGE_SCOPE}`;

/**
 * How a page's own header and body are laid out.
 *
 * A page always takes the room it is given, so nothing holds its writing to a
 * narrower column than the window allows. What it does not take is the strip
 * the outline stands in: that column stays reserved beside the writing, so the
 * index never comes to rest on top of anything else. There is nothing to choose
 * here, so nothing is asked.
 */
export const getPageAppearanceLayoutStyleClasses = (): PageAppearanceLayoutStyleClasses => ({
  outlineLayout: PAGE_OUTLINE_LAYOUT_STYLE_CLASS,
  outlineSide: PAGE_OUTLINE_SIDE_STYLE_CLASS,
  sectionPadding: PAGE_APPEARANCE_SECTION_PADDING_STYLE_CLASS,
  width: PAGE_APPEARANCE_WIDTH_STYLE_CLASS,
});

export const isPageAppearanceTextSize = (value: unknown): value is PageAppearanceTextSize =>
  typeof value === 'string' && isOneOf(PAGE_APPEARANCE_TEXT_SIZE_VALUES, value);

export const isPageAppearanceTypography = (value: unknown): value is PageAppearanceTypography =>
  typeof value === 'string' && isOneOf(PAGE_APPEARANCE_TYPOGRAPHY_VALUES, value);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isPageAppearancePreferences = (value: unknown): value is PageAppearancePreferences =>
  isRecord(value) && isPageAppearanceTextSize(value.textSize) && isPageAppearanceTypography(value.typography);

/**
 * What was chosen before, read back.
 *
 * Only what is still offered survives: a choice written down when the page also
 * remembered a width keeps its text size and its typeface, and the width it no
 * longer has any say over is left behind rather than dragged along.
 */
export const parsePageAppearancePreferences = (raw: string | null): PageAppearancePreferences => {
  if (raw === null) return PAGE_APPEARANCE_DEFAULT_PREFERENCES;
  const parsed = readJsonSafely(raw);
  if (!isPageAppearancePreferences(parsed)) return PAGE_APPEARANCE_DEFAULT_PREFERENCES;
  return { textSize: parsed.textSize, typography: parsed.typography };
};

export const serializePageAppearancePreferences = (preferences: PageAppearancePreferences): string =>
  JSON.stringify(preferences);
