'use client';

import { useEffect, useState } from 'react';
import { decideViewClientMode } from '../lib/pages.view-client-mode.lib';
import type { PageViewAggregates } from '../types/pages.schema.types';
import type { PagesViewLive, PagesViewLiveInput } from '../types/pages.view-live.types';
import { usePagesClientRows } from './use.pages.client-rows';
import { usePagesRowQuery } from './use.pages.row-query';
import { usePagesServerRows } from './use.pages.server-rows';

/**
 * How many rows the saved view lets through, as the counts of the server say once they arrive. A quick filter narrows
 * those counts, and the browser would still have to read the rows it leaves out, so with one set the last count stands.
 */
const useVisibleRowCount = (
  aggregates: Promise<PageViewAggregates | null>,
  isQuickFiltered: boolean,
): null | number => {
  const [count, setCount] = useState<null | number>(null);
  useEffect(() => {
    if (isQuickFiltered) return;
    let isCurrent = true;
    void aggregates.then((counted) => {
      if (isCurrent) setCount(counted?.distinctRowCount ?? null);
    });
    return () => {
      isCurrent = false;
    };
  }, [aggregates, isQuickFiltered]);
  return count;
};

/**
 * The rows of a view table, list, gallery or board, kept in step with what others change. A collection small enough to
 * hold is filtered, sorted, grouped and counted by the browser; a bigger one, or a view asking for what only the server
 * can answer, is placed row by row from the changes (ADR 026, ADR 029). The first drawing is always the server's.
 */
export const usePagesViewLive = (input: PagesViewLiveInput): PagesViewLive => {
  const { quickFilter, search } = usePagesRowQuery();
  const visibleRowCount = useVisibleRowCount(input.aggregates, quickFilter !== null);
  const decision =
    visibleRowCount === null
      ? null
      : decideViewClientMode({ properties: input.properties, quickFilter, search, view: input.view, visibleRowCount });
  const wantsClientMode = input.changesCursor !== null && decision?.isClientMode === true;
  const client = usePagesClientRows(input, wantsClientMode);
  const isClient = wantsClientMode && client.isReady;
  const server = usePagesServerRows(input, !isClient);
  return isClient ? { ...client, mode: 'client' } : { ...server, mode: 'server' };
};
