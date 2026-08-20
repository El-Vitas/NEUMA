import type { PageAuthor } from './pages.types';

export interface TrashedPage {
  readonly deletedAt: Date;
  readonly deletedBy: null | PageAuthor;
  readonly id: string;
  readonly parentId: null | string;
  readonly spaceId: string;
  readonly title: string;
  readonly trashedChildCount: number;
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

/** What a restore outcome means for the page: where it landed, or that nothing more needs saying. */
export type PageRestoreNotice =
  | { readonly kind: 'restored' }
  | { readonly kind: 'toRoot'; readonly space: string }
  | { readonly kind: 'underParent'; readonly parent: string };
