import type { PageGroupByMode } from '@neuma/shared';
import type { PagesBoardPaging } from './pages.board-paging.types';
import type { BoardColumnAddress, BoardPlacementContext, BoardRequeryReason } from './pages.board-placement.types';
import type { PageCollectionChanges } from './pages.query.types';
import type {
  PageRow,
  PageSchemaProperty,
  PageSchemaView,
  PageViewAggregates,
  PageViewBand,
} from './pages.schema.types';

/** A row a notice named, with the version it was written at. */
export interface BoardLiveNotice {
  readonly id: string;
  readonly version: number;
}

/** Why the board went to the server instead of placing the cards itself; logged so each cost can be measured. */
export type BoardRefreshReason = 'changes-failed' | 'column-failed' | 'reset' | 'too-many-pages' | BoardRequeryReason;

/** Everything that changed in a burst, read page after page and joined, with where the next read starts. */
export interface BoardReadChanges {
  readonly cursor: string;
  readonly rows: readonly PageRow[];
  readonly trashedIds: readonly string[];
}

export interface BoardColumnRead {
  readonly nextCursor: null | string;
  readonly rows: readonly PageRow[];
}

export interface BoardLiveOptions {
  /** Called once the bands changed, with the columns whose count has to be checked with the server. */
  readonly applyBands: (bands: readonly PageViewBand[]) => void;
  readonly coalesceMs: number;
  readonly initialCursor: string;
  readonly onCountChanged: () => void;
  readonly onLookups: (changes: PageCollectionChanges) => void;
  readonly readBands: () => readonly PageViewBand[];
  readonly readChanges: (cursor: string) => Promise<PageCollectionChanges | null>;
  readonly readColumn: (address: BoardColumnAddress, wanted: number) => Promise<BoardColumnRead | null>;
  readonly readContext: () => BoardPlacementContext;
  /** The view is drawn again from the server; `reason` says which case of the table asked for it. */
  readonly requestRefresh: (reason: BoardRefreshReason) => void;
}

export interface PagesBoardLiveInput {
  /** The counts as the server drew them. */
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** The bands as the server drew them. */
  readonly bands: readonly PageViewBand[];
  /** Where to read what changed after those bands were read; null when the board cannot follow changes. */
  readonly changesCursor: null | string;
  readonly groupByKey: string;
  readonly groupByMode: PageGroupByMode;
  readonly pageId: string;
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
  readonly subGroupByKey: string;
  readonly view: PageSchemaView;
}

export interface PagesBoardLive extends PagesBoardPaging {
  /** The counts: the server's, or the ones read again after cards were placed in the browser. */
  readonly aggregates: Promise<PageViewAggregates | null>;
}

export interface BoardLiveController {
  readonly destroy: () => void;
  /** Resolves when the notices received so far have been placed. */
  readonly flush: () => Promise<void>;
  readonly notify: (notices: readonly BoardLiveNotice[]) => void;
  /** The cursor of a fresh reading: what the server drew is as of this cursor. */
  readonly reset: (cursor: string) => void;
}
