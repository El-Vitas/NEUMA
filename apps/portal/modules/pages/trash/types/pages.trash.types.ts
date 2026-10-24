import type { PageAuthor } from '../../types/pages.types';

export interface TrashedPage {
  readonly deletedAt: Date;
  readonly deletedBy: null | PageAuthor;
  readonly id: string;
  /** A template of its collection (its parent): restoring it puts it back among the templates. */
  readonly isTemplate: boolean;
  readonly parentId: null | string;
  /** Null until an administrator deletes it forever; then the day it goes. */
  readonly purgeAfter: Date | null;
  readonly spaceId: string;
  readonly title: string;
  readonly trashedChildCount: number;
}

export interface TrashedPagesListing {
  readonly items: readonly TrashedPage[];
  /** Everything in the trash for the search, whatever the window shows. */
  readonly total: number;
}

export interface TrashDescendantsPreview {
  readonly childPageCount: number;
}

export interface TrashRestoreOutcome {
  readonly parentTitle: null | string;
  readonly restoredChildCount: number;
  readonly restoredToRoot: boolean;
  readonly spaceName: null | string;
}

export type PageRestoreNotice =
  | { readonly kind: 'restored' }
  | { readonly kind: 'toRoot'; readonly space: string }
  | { readonly kind: 'underParent'; readonly parent: string };
