import type {
  PageAppearancePreferences,
  PageAppearanceTextSize,
  PageAppearanceTypography,
} from '../types/pages.appearance.types';

export const PAGE_APPEARANCE_TEXT_SIZES = {
  Large: 'large',
  Normal: 'normal',
  Small: 'small',
} as const satisfies Record<string, PageAppearanceTextSize>;

export const PAGE_APPEARANCE_TEXT_SIZE_VALUES: readonly PageAppearanceTextSize[] = [
  PAGE_APPEARANCE_TEXT_SIZES.Small,
  PAGE_APPEARANCE_TEXT_SIZES.Normal,
  PAGE_APPEARANCE_TEXT_SIZES.Large,
];

export const PAGE_APPEARANCE_TYPOGRAPHIES = {
  Monospace: 'monospace',
  Serif: 'serif',
  System: 'system',
} as const satisfies Record<string, PageAppearanceTypography>;

export const PAGE_APPEARANCE_TYPOGRAPHY_VALUES: readonly PageAppearanceTypography[] = [
  PAGE_APPEARANCE_TYPOGRAPHIES.System,
  PAGE_APPEARANCE_TYPOGRAPHIES.Serif,
  PAGE_APPEARANCE_TYPOGRAPHIES.Monospace,
];

/** 'small' still can't drop the body text under the 16px accessible floor. */
export const PAGE_APPEARANCE_TEXT_SIZE_STYLE_CLASSES: Readonly<Record<PageAppearanceTextSize, string>> = {
  large: 'text-xl',
  normal: 'text-lg',
  small: 'text-base',
};

export const PAGE_APPEARANCE_DEFAULT_PREFERENCES: PageAppearancePreferences = {
  fullWidth: false,
  textSize: PAGE_APPEARANCE_TEXT_SIZES.Normal,
  typography: PAGE_APPEARANCE_TYPOGRAPHIES.System,
};

/** No serif token is defined for this product, so this falls back to Tailwind's own default serif stack. */
export const PAGE_APPEARANCE_TYPOGRAPHY_STYLE_CLASSES: Readonly<Record<PageAppearanceTypography, string>> = {
  monospace: 'font-mono',
  serif: 'font-serif',
  system: 'font-reading',
};

export const PAGE_APPEARANCE_FULL_WIDTH_STYLE_CLASS = 'max-w-none';

export const PAGE_APPEARANCE_CONSTRAINED_WIDTH_STYLE_CLASS = 'max-w-3xl';

export const PAGE_APPEARANCE_STORAGE_KEY_PREFIX = 'company-brain-page-appearance:';

/** The bucket a page not yet saved falls back to, since it has no id of its own yet. */
export const PAGE_APPEARANCE_NEW_PAGE_STORAGE_SCOPE = 'new';
