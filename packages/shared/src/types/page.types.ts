export type PageLifecycle = 'ACTIVE' | 'TRASHED';

export const PAGE_LIFECYCLE = {
  ACTIVE: 'ACTIVE',
  TRASHED: 'TRASHED',
} as const satisfies Record<PageLifecycle, PageLifecycle>;

export const PAGE_LIFECYCLE_VALUES = [PAGE_LIFECYCLE.ACTIVE, PAGE_LIFECYCLE.TRASHED] as const;

/**
 * A title shows in the sidebar, breadcrumb and export filename, so the cap fits the
 * narrowest. A property key is an identifier and stays short; its label is read.
 */
export const PAGE_TITLE_MAX_LENGTH = 200;
