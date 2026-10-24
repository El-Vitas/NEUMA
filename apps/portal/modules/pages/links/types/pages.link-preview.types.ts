export interface PageLinkPreview {
  readonly description?: string;
  readonly icon?: string;
  readonly title?: string;
  readonly url: string;
}

export interface LinkPreviewResolvedAddress {
  readonly address: string;
  readonly family: number;
}

export type LinkPreviewResolveAddresses = (hostname: string) => Promise<readonly LinkPreviewResolvedAddress[]>;

export interface LinkPreviewRateWindow {
  readonly count: number;
  readonly endsAt: number;
}

export interface LinkPreviewRateLimiter {
  readonly isAllowed: (key: string) => boolean;
}

export interface LinkPreviewRateLimiterSettings {
  readonly maximum: number;
  readonly now: () => number;
  readonly trackedKeysMaximum: number;
  readonly windowMs: number;
}
