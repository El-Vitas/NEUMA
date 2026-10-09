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

/** Keeps only the fields still offered, so stored data with extra keys (a former width) still loads. */
export const parsePageAppearancePreferences = (raw: string | null): PageAppearancePreferences => {
  if (raw === null) return PAGE_APPEARANCE_DEFAULT_PREFERENCES;
  const parsed = readJsonSafely(raw);
  if (!isPageAppearancePreferences(parsed)) return PAGE_APPEARANCE_DEFAULT_PREFERENCES;
  return { textSize: parsed.textSize, typography: parsed.typography };
};

export const serializePageAppearancePreferences = (preferences: PageAppearancePreferences): string =>
  JSON.stringify(preferences);
