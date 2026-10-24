export interface PagesWindowVirtualizerInput {
  readonly count: number;
  /** Pixels assumed for an item until it is drawn and its height is read. */
  readonly estimateSize: number;
  /** An index that must stay drawn even when it scrolls out of view, such as the card being dragged. */
  readonly keepIndex?: null | number;
}

/** Which items of a long list to draw, and how much room the ones left out take. */
export interface PagesWindow {
  /** Pixels of the items below the ones drawn. */
  readonly after: number;
  /** Pixels of the items above the ones drawn. */
  readonly before: number;
  /** The indexes to draw, or null when the list is short enough to draw whole. */
  readonly indexes: null | readonly number[];
}

/**
 * What to draw, and what goes on the element where the list starts (which tells the scroll of the page apart from the
 * list's own). They come apart so what is drawn can be read freely while only the second is handed to an element.
 */
export type PagesWindowVirtualizer<TContainer extends HTMLElement> = readonly [
  PagesWindow,
  (element: TContainer | null) => void,
];

export interface PagesHeightsStore {
  readonly getSnapshot: () => ReadonlyMap<number, number>;
  /** Reads the heights of the items drawn in the list that starts at `container`, and tells whoever listens. */
  readonly measure: (container: HTMLElement) => void;
  readonly subscribe: (listener: () => void) => () => void;
}

/** What the scroll of the page says: how far it is scrolled, how tall it is, and where the list starts in it. */
export interface PagesWindowViewport {
  readonly height: number;
  readonly offset: number;
  readonly top: number;
}

export interface PagesVisibleWindowInput {
  readonly count: number;
  readonly estimateSize: number;
  readonly heights: ReadonlyMap<number, number>;
  readonly keepIndex: null | number;
  readonly overscan: number;
  readonly viewport: PagesWindowViewport;
}

/** Where each item starts, and how tall the whole list is. */
export interface ItemOffsets {
  readonly starts: readonly number[];
  readonly total: number;
}

export interface PagesVisibleRange {
  readonly from: number;
  readonly to: number;
}

export interface PagesVisibleRangeInput {
  readonly count: number;
  readonly estimateSize: number;
  readonly heights: ReadonlyMap<number, number>;
  readonly offsets: ItemOffsets;
  readonly overscan: number;
  readonly viewport: PagesWindowViewport;
}

export interface PagesVisibleWindowOfRangeInput {
  readonly count: number;
  readonly estimateSize: number;
  readonly heights: ReadonlyMap<number, number>;
  readonly keepIndex: null | number;
  readonly offsets: ItemOffsets;
  readonly range: PagesVisibleRange;
}

export interface PagesVisibleWindow {
  readonly after: number;
  readonly before: number;
  readonly indexes: readonly number[];
}
