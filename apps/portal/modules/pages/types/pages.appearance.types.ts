export type PageAppearanceTextSize = 'large' | 'normal' | 'small';

export type PageAppearanceTypography = 'monospace' | 'serif' | 'system';

export interface PageAppearancePreferences {
  readonly fullWidth: boolean;
  readonly textSize: PageAppearanceTextSize;
  readonly typography: PageAppearanceTypography;
}

export interface PagesAppearanceResult {
  readonly preferences: PageAppearancePreferences;
  readonly setFullWidth: (fullWidth: boolean) => void;
  readonly setTextSize: (textSize: PageAppearanceTextSize) => void;
  readonly setTypography: (typography: PageAppearanceTypography) => void;
}
