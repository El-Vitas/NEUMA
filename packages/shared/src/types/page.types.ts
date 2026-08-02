export type PageLifecycle = 'ACTIVE' | 'TRASHED';

export const PAGE_LIFECYCLE = {
  ACTIVE: 'ACTIVE',
  TRASHED: 'TRASHED',
} as const satisfies Record<PageLifecycle, PageLifecycle>;

export const PAGE_LIFECYCLE_VALUES = [PAGE_LIFECYCLE.ACTIVE, PAGE_LIFECYCLE.TRASHED] as const;
