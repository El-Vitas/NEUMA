'use client';

import type { ReactNode } from 'react';
import { useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { LOCAL_CACHE_OUTBOX_CHANGED_EVENT } from '../../local-cache/constants/local-cache.constants';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '../constants/pages.collection-notices.context.constants';
import { PAGE_COLLECTION_CACHE_CONTEXT } from '../constants/pages.view-cache.context.constants';
import { PAGE_ROW_STORE_CONTEXT, PAGE_VIEW_WRITES_CONTEXT } from '../constants/pages.view-writes.context.constants';
import { createPageRowStore } from '../lib/pages.row-store.lib';
import { writeViewNow } from '../lib/pages.view-writes.direct.lib';
import { createViewWriteQueue } from '../lib/pages.view-writes.lib';
import { toOptimisticRows } from '../lib/pages.view-writes.optimistic.lib';
import { sendViewWrite } from '../lib/pages.view-writes.send.lib';
import {
  readWrittenRowId,
  readWrittenValues,
  scheduleViewWriteRetry,
  subscribeToNothing,
} from '../lib/pages.view-writes.written.lib';
import type { PagesViewWrites, PageViewWrite, ViewWriteSettled } from '../types/pages.view-writes.types';

interface IProps {
  readonly children: ReactNode;
  readonly collectionId: string;
}

/**
 * The changes the views of a collection make go through a queue kept on disk: each is shown at once, sent in order,
 * and sent again with the same id if the network or the tab is lost in between (ADR 029). Without a disk the queue
 * lives in memory and says so. The rows held in client mode are shared here so a change shows on them before it is
 * answered.
 */
export const PagesCollectionWritesProvider = ({ children, collectionId }: IProps) => {
  const session = useContext(PAGE_COLLECTION_CACHE_CONTEXT);
  const notices = useContext(PAGE_COLLECTION_NOTICES_CONTEXT);
  const [store] = useState(createPageRowStore);
  const [unanswered, setUnanswered] = useState<readonly PageViewWrite[]>([]);

  const queue = useMemo(
    () =>
      session === null
        ? null
        : createViewWriteQueue({
            collectionId,
            newId: () => crypto.randomUUID(),
            onAnswered: (_id, write, answer) => {
              setUnanswered((current) => current.filter((held) => held !== write));
              if (answer.kind !== 'rejected') return;
              window.dispatchEvent(new Event(LOCAL_CACHE_OUTBOX_CHANGED_EVENT));
              notices.requestRefresh('write-rejected');
            },
            outbox: session.outbox,
            ownerId: crypto.randomUUID(),
            scheduleRetry: scheduleViewWriteRetry,
            send: sendViewWrite,
          }),
    [collectionId, notices, session],
  );

  useEffect(() => {
    if (queue === null) return;
    const resume = (): void => {
      queue.resume().catch((error: unknown) => {
        browserLogger.error({ err: error }, 'The changes kept of this collection could not be sent');
      });
    };
    resume();
    window.addEventListener('online', resume);
    return () => window.removeEventListener('online', resume);
  }, [queue]);

  const pendingCount = useSyncExternalStore(
    queue?.subscribe ?? subscribeToNothing,
    () => queue?.pendingCount() ?? 0,
    () => 0,
  );

  const value = useMemo<PagesViewWrites>(() => {
    const showOptimistically = (write: PageViewWrite): void => {
      const rowId = readWrittenRowId(write);
      store.upsertRows(toOptimisticRows(write, rowId === null ? undefined : store.getRow(rowId)));
      if (write.kind !== 'move') return;
      store.moveRow(write.rowId, {
        ...(write.after === undefined ? {} : { after: write.after }),
        ...(write.before === undefined ? {} : { before: write.before }),
      });
    };
    return {
      isPersistent: session?.isPersistent ?? true,
      pendingCount,
      readPendingValue: (rowId, propertyKey) => {
        for (const write of unanswered.toReversed()) {
          const values = readWrittenValues(write);
          if (readWrittenRowId(write) === rowId && Object.hasOwn(values, propertyKey))
            return values[propertyKey] ?? null;
        }
        return;
      },
      write: async (write, description): Promise<ViewWriteSettled> => {
        showOptimistically(write);
        if (queue === null) return writeViewNow(write);
        setUnanswered((current) => [...current, write]);
        return queue.enqueue(write, description);
      },
      writeNow: async (write): Promise<ViewWriteSettled> => {
        showOptimistically(write);
        const settled = await writeViewNow(write);
        if (settled.kind === 'rejected') notices.requestRefresh('write-rejected');
        return settled;
      },
    };
  }, [notices, pendingCount, queue, session, store, unanswered]);

  return (
    <PAGE_ROW_STORE_CONTEXT value={store}>
      <PAGE_VIEW_WRITES_CONTEXT value={value}>{children}</PAGE_VIEW_WRITES_CONTEXT>
    </PAGE_ROW_STORE_CONTEXT>
  );
};
