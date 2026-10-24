import { createContext } from 'react';
import { writeViewNow } from '../lib/pages.view-writes.direct.lib';
import type { PageRowStore } from '../types/pages.row-store.types';
import type { PagesViewWriteActions, PagesViewWrites } from '../types/pages.view-writes.types';

/** What a view writes through when nobody has given it a queue: every write goes now and nothing is kept. */
export const DIRECT_VIEW_WRITES: PagesViewWrites = {
  isPersistent: true,
  pendingCount: 0,
  readPendingValue: () => undefined,
  write: (write) => writeViewNow(write),
  writeNow: (write) => writeViewNow(write),
};

/** Without a provider a view writes straight to the server, as it did before there was a queue. */
export const PAGE_VIEW_WRITES_CONTEXT = createContext<PagesViewWrites>(DIRECT_VIEW_WRITES);

/** The same without a queue, for the cells: nothing is ever pending. */
export const DIRECT_VIEW_WRITE_ACTIONS: PagesViewWriteActions = {
  pendingValues: {
    add: () => undefined,
    read: () => undefined,
    remove: () => undefined,
    subscribeRow: () => () => undefined,
  },
  write: (write) => writeViewNow(write),
  writeNow: (write) => writeViewNow(write),
};

/** What a cell writes through; unlike the context above it does not change with every edit. */
export const PAGE_VIEW_WRITE_ACTIONS_CONTEXT = createContext<PagesViewWriteActions>(DIRECT_VIEW_WRITE_ACTIONS);

/** The rows a collection shows that the browser holds: shared so a write can be shown on them before it is answered. */
export const PAGE_ROW_STORE_CONTEXT = createContext<null | PageRowStore>(null);
