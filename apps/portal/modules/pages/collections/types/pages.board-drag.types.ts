import type { PageGroupByMode } from '@neuma/shared';
import type { PageSchemaProperty, PageViewBand } from './pages.schema.types';

export interface PageBoardDragInput {
  readonly bands: readonly PageViewBand[];
  readonly groupByKey: string;
  readonly groupByMode: PageGroupByMode;
  /** False when the view sorts its cards: their place is then the sort's, and only the value is written. */
  readonly isManualOrder: boolean;
  /** The collection the cards are rows of. */
  readonly pageId: string;
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
  /** Empty when the board has a single grouping dimension. */
  readonly subGroupByKey?: string;
  readonly viewId: string;
}

export type PageBoardMoveDirection = 'BACKWARD' | 'FORWARD';

export type PageBoardDropSide = 'AFTER' | 'BEFORE';

export interface PageBoardDropTarget {
  /** Null means the end of the column. */
  readonly beforeRowId: null | string;
  readonly groupKey: string;
}

export interface PageBoardGridDropTarget extends PageBoardDropTarget {
  /** Empty when the board has no bands, since there is then a single one. */
  readonly bandKey: string;
}

export interface PageBoardMove {
  readonly beforeRowId: null | string;
  readonly changesGroup: boolean;
  readonly changesOrder: boolean;
  /** Null when the card did not change column. */
  readonly propertyValue: null | string;
}

export interface PageBoardGridMove extends PageBoardMove {
  /** Null when the card did not change band. */
  readonly bandValue: null | string;
  readonly changesBand: boolean;
}

/** A single mode rather than two flags: the small header can edit the name or the limit, never both. */
export type PageBoardColumnMode = 'NAMED' | 'RENAMING' | 'LIMITING' | 'REMOVING';

/** `target` is the column it would land before, null for the end. */
export interface PageBoardColumnDrag {
  readonly carried: null | string;
  readonly onDropOn: (beforeValue: null | string) => void;
  readonly onEnd: () => void;
  readonly onOver: (beforeValue: null | string) => void;
  readonly onStart: (value: string) => void;
  readonly target: null | string;
}

export interface PageBoardNamingCell {
  readonly bandKey: string;
  readonly groupKey: string;
}

export interface PageBoardDragState {
  readonly fromBandKey: string;
  readonly fromGroupKey: string;
  readonly rowId: string;
}

export interface PageBoardDragController {
  readonly announcement: string;
  /** Includes the optimistic result of a just-dropped card. */
  readonly bands: readonly PageViewBand[];
  readonly draggingRowId: null | string;
  readonly isMoving: boolean;
  readonly moveByKeyboard: (rowId: string, fromGroupKey: string, direction: PageBoardMoveDirection) => void;
  readonly onDragEnd: () => void;
  readonly onDragLeave: (groupKey: string) => void;
  readonly onDragOver: (target: PageBoardGridDropTarget) => void;
  readonly onDragStart: (rowId: string, fromGroupKey: string, fromBandKey: string) => void;
  readonly onDrop: () => void;
  readonly target: null | PageBoardGridDropTarget;
}

/** A move the network has not carried yet, kept on screen where the person dropped the card. */
export interface QueuedBoardMove {
  readonly move: PageBoardGridMove;
  readonly rowId: string;
}
