'use client';

import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import {
  PAGE_SCROLL_CONTAINER_SELECTOR,
  PAGE_VIRTUAL_OVERSCAN,
  PAGE_VIRTUAL_THRESHOLD,
} from '../constants/pages.virtualization.constants';
import { createHeightsStore, readListOffset, readVisibleIndexes } from '../lib/pages.virtualization.lib';
import type { PagesWindowVirtualizer, PagesWindowVirtualizerInput } from '../types/pages.virtualization.types';

/**
 * Draws only the items in view plus a margin, for lists that follow the scroll of the page (the main area of the
 * portal, not the window). A list shorter than the threshold is drawn whole: windowing a few items buys nothing and
 * costs the page its natural layout. The item being dragged stays drawn, since a drag that loses its source stops.
 * Each drawn item carries its `data-index`; its height is read after it is drawn and replaces the estimate.
 */
export const usePagesWindowVirtualizer = <TContainer extends HTMLElement>({
  count,
  estimateSize,
  keepIndex,
}: PagesWindowVirtualizerInput): PagesWindowVirtualizer<TContainer> => {
  const [container, attachContainer] = useState<TContainer | null>(null);
  const [heightsStore] = useState(createHeightsStore);
  const scroller = container?.closest<HTMLElement>(PAGE_SCROLL_CONTAINER_SELECTOR) ?? null;

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
  const top = useSyncExternalStore(
    subscribeToScroll,
    () => scroller?.scrollTop ?? 0,
    () => 0,
  );
  const height = useSyncExternalStore(
    subscribeToScroll,
    () => scroller?.clientHeight ?? 0,
    () => 0,
  );
  const offset = useSyncExternalStore(
    subscribeToScroll,
    () => (container === null || scroller === null ? 0 : readListOffset(container, scroller)),
    () => 0,
  );
  const heights = useSyncExternalStore(heightsStore.subscribe, heightsStore.getSnapshot, heightsStore.getSnapshot);
  const isWindowed = count > PAGE_VIRTUAL_THRESHOLD && scroller !== null;

  useLayoutEffect(() => {
    if (isWindowed && container !== null) heightsStore.measure(container);
  });

  if (!isWindowed) return [{ after: 0, before: 0, indexes: null }, attachContainer];
  const visible = readVisibleIndexes({
    count,
    estimateSize,
    heights,
    keepIndex: keepIndex ?? null,
    overscan: PAGE_VIRTUAL_OVERSCAN,
    viewport: { height, offset, top },
  });
  return [{ after: visible.after, before: visible.before, indexes: visible.indexes }, attachContainer];
};
