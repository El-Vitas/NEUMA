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
  textSize: PAGE_APPEARANCE_TEXT_SIZES.Normal,
  typography: PAGE_APPEARANCE_TYPOGRAPHIES.System,
};

/** No serif token is defined for this product, so this falls back to Tailwind's own default serif stack. */
export const PAGE_APPEARANCE_TYPOGRAPHY_STYLE_CLASSES: Readonly<Record<PageAppearanceTypography, string>> = {
  monospace: 'font-mono',
  serif: 'font-serif',
  system: 'font-reading',
};

/** A page takes the room it is given: nothing holds its writing to a narrower column. */
export const PAGE_APPEARANCE_WIDTH_STYLE_CLASS = 'max-w-none';

/**
 * Writing pressed against the edge of the window is hard to read, so a page keeps a margin of its own.
 *
 * The wide left margin is the lane the block grips stand in, and those answer to
 * a mouse. On a narrow screen there is no mouse to summon them and no room to
 * spare, so the lane is not reserved: the writing gets that width instead.
 */
export const PAGE_APPEARANCE_SECTION_PADDING_STYLE_CLASS =
  'py-6 pr-4 pl-4 sm:py-8 sm:pr-6 sm:pl-14 lg:py-12 lg:pr-8 lg:pl-16 xl:pr-10';

export const PAGE_APPEARANCE_STORAGE_KEY_PREFIX = 'company-brain-page-appearance:';

/** The bucket a page not yet saved falls back to, since it has no id of its own yet. */
export const PAGE_APPEARANCE_NEW_PAGE_STORAGE_SCOPE = 'new';
