export type PageAppearanceTextSize = 'large' | 'normal' | 'small';

export type PageAppearanceTypography = 'monospace' | 'serif' | 'system';

export interface PageAppearancePreferences {
  readonly textSize: PageAppearanceTextSize;
  readonly typography: PageAppearanceTypography;
}

export interface PagesAppearanceResult {
  readonly preferences: PageAppearancePreferences;
  readonly setTextSize: (textSize: PageAppearanceTextSize) => void;
  readonly setTypography: (typography: PageAppearanceTypography) => void;
}

/** The classes a page's own layout is drawn with. */
export interface PageAppearanceLayoutStyleClasses {
  readonly outlineLayout: string;
  readonly outlineSide: string;
  readonly sectionPadding: string;
  readonly width: string;
}
