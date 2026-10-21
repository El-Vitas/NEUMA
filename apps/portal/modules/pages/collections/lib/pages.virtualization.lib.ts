import { NO_MEASURED_HEIGHTS } from '../constants/pages.virtualization.constants';
import type {
  PagesHeightsStore,
  PagesVisibleWindow,
  PagesVisibleWindowInput,
} from '../types/pages.virtualization.types';

/** Where the list starts inside what scrolls: the distance from the top of the scroll area to the top of the list. */
export const readListOffset = (container: HTMLElement, scroller: HTMLElement): number =>
  container.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

const heightOf = (heights: ReadonlyMap<number, number>, index: number, estimateSize: number): number =>
  heights.get(index) ?? estimateSize;

/** The distance from the start of the list to the start of each item, and the height of all of them together. */
const readOffsets = (
  count: number,
  estimateSize: number,
  heights: ReadonlyMap<number, number>,
): { readonly starts: readonly number[]; readonly total: number } => {
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
  const { starts, total } = readOffsets(count, estimateSize, heights);
  const heightAt = (index: number): number => heightOf(heights, index, estimateSize);
  const top = Math.max(0, viewport.top - viewport.offset);
  const first = findFirstEndingAfter(starts, heightAt, top);
  const last = findFirstEndingAfter(starts, heightAt, top + viewport.height);
  const from = Math.max(0, first - overscan);
  const to = Math.min(count - 1, last + overscan);
  const indexes = Array.from({ length: to - from + 1 }, (_unused, offset) => from + offset);
  const kept = keepIndex !== null && keepIndex >= 0 && keepIndex < count && !indexes.includes(keepIndex);
  const drawn = kept ? [...indexes, keepIndex].sort((left, right) => left - right) : indexes;
  const before = starts[from] ?? 0;
  const after = Math.max(0, total - ((starts[to] ?? 0) + heightAt(to)));
  return { after, before, indexes: drawn };
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
