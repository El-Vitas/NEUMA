'use client';

import { useCallback, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  NO_VISIBLE_RANGE_KEY,
  PAGE_SCROLL_CONTAINER_SELECTOR,
  PAGE_VIRTUAL_OVERSCAN,
  PAGE_VIRTUAL_THRESHOLD,
} from '../constants/pages.virtualization.constants';
import {
  buildItemOffsets,
  createHeightsStore,
  fromRangeKey,
  readListOffset,
  readVisibleRange,
  toRangeKey,
  toVisibleWindow,
} from '../lib/pages.virtualization.lib';
import type { PagesWindowVirtualizer, PagesWindowVirtualizerInput } from '../types/pages.virtualization.types';

/**
 * Draws only the items in view plus a margin, for lists that follow the scroll of the page (the main area of the
 * portal, not the window). A shorter list than the threshold is drawn whole. The item being dragged stays drawn.
 * Each drawn item carries its `data-index`; its height is read after it is drawn. The component listens to the first
 * and last item in view, not to the scroll, so a scroll inside the same items draws nothing.
 */
export const usePagesWindowVirtualizer = <TContainer extends HTMLElement>({
  count,
  estimateSize,
  keepIndex,
}: PagesWindowVirtualizerInput): PagesWindowVirtualizer<TContainer> => {
  const [container, attachContainer] = useState<TContainer | null>(null);
  const [heightsStore] = useState(createHeightsStore);
  const scroller = container?.closest<HTMLElement>(PAGE_SCROLL_CONTAINER_SELECTOR) ?? null;
  const heights = useSyncExternalStore(heightsStore.subscribe, heightsStore.getSnapshot, heightsStore.getSnapshot);
  const isWindowed = count > PAGE_VIRTUAL_THRESHOLD && scroller !== null;
  const offsets = useMemo(
    () => (isWindowed ? buildItemOffsets(count, estimateSize, heights) : null),
    [count, estimateSize, heights, isWindowed],
  );

  const subscribeToScroll = useCallback(
    (onChange: () => void): (() => void) => {
      if (scroller === null) return () => undefined;
      scroller.addEventListener('scroll', onChange, { passive: true });
      window.addEventListener('resize', onChange);
      return () => {
        scroller.removeEventListener('scroll', onChange);
        window.removeEventListener('resize', onChange);
      };
    },
    [scroller],
  );
  const readCurrentRangeKey = useCallback((): string => {
    if (offsets === null || container === null || scroller === null) return NO_VISIBLE_RANGE_KEY;
    const range = readVisibleRange({
      count,
      estimateSize,
      heights,
      offsets,
      overscan: PAGE_VIRTUAL_OVERSCAN,
      viewport: { height: scroller.clientHeight, offset: readListOffset(container, scroller), top: scroller.scrollTop },
    });
    return toRangeKey(range);
  }, [container, count, estimateSize, heights, offsets, scroller]);
  const rangeKey = useSyncExternalStore(subscribeToScroll, readCurrentRangeKey, () => NO_VISIBLE_RANGE_KEY);
  const visible = useMemo(
    () =>
      offsets === null
        ? null
        : toVisibleWindow({
            count,
            estimateSize,
            heights,
            keepIndex: keepIndex ?? null,
            offsets,
            range: fromRangeKey(rangeKey),
          }),
    [count, estimateSize, heights, keepIndex, offsets, rangeKey],
  );

  useLayoutEffect(() => {
    if (isWindowed && container !== null) heightsStore.measure(container);
  });

  if (visible === null) return [{ after: 0, before: 0, indexes: null }, attachContainer];
  return [{ after: visible.after, before: visible.before, indexes: visible.indexes }, attachContainer];
};
