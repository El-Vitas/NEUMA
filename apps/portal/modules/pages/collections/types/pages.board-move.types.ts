import type { PageGroupByMode } from '@neuma/shared';
import type { PageBoardGridMove } from './pages.board-drag.types';
import type { PagePropertyValue, PageSchemaProperty } from './pages.schema.types';

/** Where a dropped card goes among the others of the view, told as the neighbour it sits beside. */
export interface PageBoardAnchor {
  readonly after?: string;
  readonly before?: string;
}

export interface BoardAxisInput {
  readonly from: string;
  readonly mode: PageGroupByMode;
  readonly properties: readonly PageSchemaProperty[];
  readonly property: PageSchemaProperty | undefined;
  readonly to: null | string;
}

/** What leaves and what enters a list the card holds, so the write is relative to the list as it is then. */
export interface BoardListChange {
  readonly add: string[];
  readonly remove: string[];
}

/** What a drop writes: whole values for properties that hold one, and list changes for those that hold several. */
export interface BoardMoveWrite {
  readonly listChanges: Readonly<Record<string, BoardListChange>>;
  readonly values: Readonly<Record<string, PagePropertyValue | null>>;
}

/** What one axis of the board writes: a value, or a change of the list. */
export type BoardAxisWrite =
  | { readonly kind: 'list'; readonly change: BoardListChange }
  | { readonly kind: 'value'; readonly value: PagePropertyValue | null };

export interface BoardValuesInput {
  /** Where the card was picked up. */
  readonly fromBandKey: string;
  readonly fromGroupKey: string;
  readonly groupByKey: string;
  readonly mode: PageGroupByMode;
  readonly move: PageBoardGridMove;
  readonly properties: readonly PageSchemaProperty[];
  readonly subGroupByKey: string;
}
