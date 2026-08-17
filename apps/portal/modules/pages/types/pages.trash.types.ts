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
  readonly restoredChildCount: number;
  readonly restoredToRoot: boolean;
}
