import { NO_MEASURED_HEIGHTS } from '../constants/pages.virtualization.constants';
import type {
  ItemOffsets,
  PagesHeightsStore,
  PagesVisibleRange,
  PagesVisibleRangeInput,
  PagesVisibleWindow,
  PagesVisibleWindowInput,
  PagesVisibleWindowOfRangeInput,
} from '../types/pages.virtualization.types';

/** Where the list starts inside what scrolls: the distance from the top of the scroll area to the top of the list. */
export const readListOffset = (container: HTMLElement, scroller: HTMLElement): number =>
  container.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

const heightOf = (heights: ReadonlyMap<number, number>, index: number, estimateSize: number): number =>
  heights.get(index) ?? estimateSize;

/**
 * The distance from the start of the list to the start of each item, and the height of all of them together. Built
 * once per change of count or heights, and searched on every scroll.
 */
export const buildItemOffsets = (
  count: number,
  estimateSize: number,
  heights: ReadonlyMap<number, number>,
): ItemOffsets => {
  const starts: number[] = [];
  let running = 0;
  for (let index = 0; index < count; index += 1) {
    starts.push(running);
    running += heightOf(heights, index, estimateSize);
  }
  return { starts, total: running };
};

/** The first item whose end is past `position`, or the last one when none is. */
const findFirstEndingAfter = (
  starts: readonly number[],
  heightAt: (index: number) => number,
  position: number,
): number => {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((starts[middle] ?? 0) + heightAt(middle) > position) high = middle;
    else low = middle + 1;
  }
  return low;
};

/** The first and last item in view with a margin of `overscan` on each side: a binary search, no walk of the list. */
export const readVisibleRange = ({
  count,
  estimateSize,
  heights,
  offsets,
  overscan,
  viewport,
}: PagesVisibleRangeInput): PagesVisibleRange => {
  const heightAt = (index: number): number => heightOf(heights, index, estimateSize);
  const top = Math.max(0, viewport.top - viewport.offset);
  const first = findFirstEndingAfter(offsets.starts, heightAt, top);
  const last = findFirstEndingAfter(offsets.starts, heightAt, top + viewport.height);
  return { from: Math.max(0, first - overscan), to: Math.min(count - 1, last + overscan) };
};

/** The range as text, so React compares it by value and draws again only when the first or last item changes. */
export const toRangeKey = (range: PagesVisibleRange): string => `${String(range.from)}:${String(range.to)}`;

export const fromRangeKey = (key: string): PagesVisibleRange => {
  const [from = '0', to = '-1'] = key.split(':');
  return { from: Number(from), to: Number(to) };
};

/** The items of a range, the one that must stay drawn, and the room of the ones left out above and below. */
export const toVisibleWindow = ({
  count,
  estimateSize,
  heights,
  keepIndex,
  offsets,
  range,
}: PagesVisibleWindowOfRangeInput): PagesVisibleWindow => {
  const { from, to } = range;
  const indexes = Array.from({ length: Math.max(0, to - from + 1) }, (_unused, offset) => from + offset);
  const kept = keepIndex !== null && keepIndex >= 0 && keepIndex < count && !indexes.includes(keepIndex);
  const drawn = kept ? [...indexes, keepIndex].sort((left, right) => left - right) : indexes;
  const before = offsets.starts[from] ?? 0;
  const after = Math.max(0, offsets.total - ((offsets.starts[to] ?? 0) + heightOf(heights, to, estimateSize)));
  return { after, before, indexes: drawn };
};

/**
 * What to draw of a long list: the items in view with a margin of `overscan` on each side, plus the one that must
 * stay drawn, and how much room the ones left out take above and below so the scroll does not jump.
 */
export const readVisibleIndexes = ({
  count,
  estimateSize,
  heights,
  keepIndex,
  overscan,
  viewport,
}: PagesVisibleWindowInput): PagesVisibleWindow => {
  const offsets = buildItemOffsets(count, estimateSize, heights);
  const range = readVisibleRange({ count, estimateSize, heights, offsets, overscan, viewport });
  return toVisibleWindow({ count, estimateSize, heights, keepIndex, offsets, range });
};

/**
 * The heights of the items now drawn, read from the page: each one carries its `data-index`. Null when none differs
 * from what is known, so a layout that has settled does not ask for another draw.
 */
export const measureDrawnItems = (
  container: HTMLElement,
  known: ReadonlyMap<number, number>,
): ReadonlyMap<number, number> | null => {
  const drawn = container.parentElement?.querySelectorAll<HTMLElement>('[data-index]') ?? [];
  const next = new Map(known);
  let hasChanged = false;
  for (const element of drawn) {
    const index = Number(element.dataset.index);
    const height = element.getBoundingClientRect().height;
    if (!Number.isInteger(index) || height === 0 || Math.abs((known.get(index) ?? 0) - height) < 1) continue;
    next.set(index, height);
    hasChanged = true;
  }
  return hasChanged ? next : null;
};

/** What is known about the heights of a list, shared with what draws it: a change tells it to draw again. */
export const createHeightsStore = (): PagesHeightsStore => {
  let heights: ReadonlyMap<number, number> = NO_MEASURED_HEIGHTS;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => heights,
    measure: (container) => {
      const measured = measureDrawnItems(container, heights);
      if (measured === null) return;
      heights = measured;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
