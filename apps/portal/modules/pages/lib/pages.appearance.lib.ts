import { readJsonSafely } from '@/shared/lib/json.lib';
import {
  PAGE_APPEARANCE_CONSTRAINED_WIDTH_STYLE_CLASS,
  PAGE_APPEARANCE_DEFAULT_PREFERENCES,
  PAGE_APPEARANCE_FULL_WIDTH_STYLE_CLASS,
  PAGE_APPEARANCE_NEW_PAGE_STORAGE_SCOPE,
  PAGE_APPEARANCE_STORAGE_KEY_PREFIX,
  PAGE_APPEARANCE_TEXT_SIZE_VALUES,
  PAGE_APPEARANCE_TYPOGRAPHY_VALUES,
} from '../constants/pages.appearance.constants';
import type {
  PageAppearancePreferences,
  PageAppearanceTextSize,
  PageAppearanceTypography,
} from '../types/pages.appearance.types';

export const buildPageAppearanceStorageKey = (pageId: string | null): string =>
  `${PAGE_APPEARANCE_STORAGE_KEY_PREFIX}${pageId ?? PAGE_APPEARANCE_NEW_PAGE_STORAGE_SCOPE}`;

/** The width a page's own header and body share, so choosing full width ever widens both together. */
export const getPageAppearanceWidthStyleClass = (fullWidth: boolean): string =>
  fullWidth ? PAGE_APPEARANCE_FULL_WIDTH_STYLE_CLASS : PAGE_APPEARANCE_CONSTRAINED_WIDTH_STYLE_CLASS;

export const isPageAppearanceTextSize = (value: unknown): value is PageAppearanceTextSize =>
  typeof value === 'string' && PAGE_APPEARANCE_TEXT_SIZE_VALUES.some((textSize) => textSize === value);

export const isPageAppearanceTypography = (value: unknown): value is PageAppearanceTypography =>
  typeof value === 'string' && PAGE_APPEARANCE_TYPOGRAPHY_VALUES.some((typography) => typography === value);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isPageAppearancePreferences = (value: unknown): value is PageAppearancePreferences =>
  isRecord(value) &&
  typeof value.fullWidth === 'boolean' &&
  isPageAppearanceTextSize(value.textSize) &&
  isPageAppearanceTypography(value.typography);

export const parsePageAppearancePreferences = (raw: string | null): PageAppearancePreferences => {
  if (raw === null) return PAGE_APPEARANCE_DEFAULT_PREFERENCES;
  const parsed = readJsonSafely(raw);
  return isPageAppearancePreferences(parsed) ? parsed : PAGE_APPEARANCE_DEFAULT_PREFERENCES;
};

export const serializePageAppearancePreferences = (preferences: PageAppearancePreferences): string =>
  JSON.stringify(preferences);
