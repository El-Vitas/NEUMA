import type { PageCollectionChanges } from './pages.query.types';
import type { PageRow } from './pages.schema.types';

/** A row a notice named, with the version it was written at. */
export interface ChangesNotice {
  readonly id: string;
  readonly version: number;
}

/** Why the changes could not be read and applied by the browser, so it asks the server for the view again. */
export type ChangesReadFailure = 'changes-failed' | 'linked-truncated' | 'reset' | 'too-many-pages';

/** Everything that changed in a burst, read page after page and joined, with where the next read starts. */
export interface ChangesBatch {
  readonly cursor: string;
  readonly rows: readonly PageRow[];
  /** The rows the reader can open and are active, as of the last read: to notice one that was hidden. */
  readonly total: number;
  readonly trashedIds: readonly string[];
}

export interface ChangesControllerOptions<Reason extends string> {
  /** Puts the batch in the view; the reason it could not, or null once it did. `isActive` goes false when destroyed. */
  readonly apply: (batch: ChangesBatch, isActive: () => boolean) => Promise<null | Reason>;
  readonly coalesceMs: number;
  readonly initialCursor: string;
  readonly onLookups: (changes: PageCollectionChanges) => void;
  readonly readChanges: (cursor: string) => Promise<PageCollectionChanges | null>;
  /** The view is drawn again from the server; `reason` says which case of the table asked for it. */
  readonly requestRefresh: (reason: ChangesReadFailure | Reason) => void;
}

export interface ChangesController {
  readonly destroy: () => void;
  /** Resolves when the notices received so far have been applied. */
  readonly flush: () => Promise<void>;
  readonly notify: (notices: readonly ChangesNotice[]) => void;
  /** The cursor of a fresh reading: what the server drew is as of this cursor. */
  readonly reset: (cursor: string) => void;
}
