'use client';

import type { ReactNode } from 'react';
import { useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { browserLogger } from '../../lib/pages.browser-logger.lib';
import {
  LOCAL_CACHE_OUTBOX_CHANGED_EVENT,
  LOCAL_CACHE_OUTBOX_RETRY_EVENT,
} from '../../local-cache/constants/local-cache.constants';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '../constants/pages.collection-notices.context.constants';
import { PAGE_COLLECTION_CACHE_CONTEXT } from '../constants/pages.view-cache.context.constants';
import {
  PAGE_ROW_STORE_CONTEXT,
  PAGE_VIEW_WRITE_ACTIONS_CONTEXT,
  PAGE_VIEW_WRITES_CONTEXT,
} from '../constants/pages.view-writes.context.constants';
import { createPageRowStore } from '../lib/pages.row-store.lib';
import { writeViewNow } from '../lib/pages.view-writes.direct.lib';
import { createViewWriteQueue } from '../lib/pages.view-writes.lib';
import { toOptimisticRows } from '../lib/pages.view-writes.optimistic.lib';
import { createPendingValuesStore } from '../lib/pages.view-writes.pending.lib';
import { sendViewWrite } from '../lib/pages.view-writes.send.lib';
import { createExpectedVersionStamper } from '../lib/pages.view-writes.versioning.lib';
import { readWrittenRowId, scheduleViewWriteRetry, subscribeToNothing } from '../lib/pages.view-writes.written.lib';
import type {
  PagesViewWriteActions,
  PagesViewWrites,
  PageViewWrite,
  ViewWriteSettled,
} from '../types/pages.view-writes.types';

interface IProps {
  readonly children: ReactNode;
  readonly collectionId: string;
}

/**
 * The changes the views of a collection make go through a queue kept on disk: each is shown at once, sent in order,
 * and sent again if the network or the tab is lost in between (ADR 029). Only a new row carries an id the server
 * repeats back; a cell or a move is replayed as written, with no version to compare. Without a disk the queue
 * lives in memory and says so. The rows held in client mode are shared here so a change shows on them before it is
 * answered.
 */
export const PagesCollectionWritesProvider = ({ children, collectionId }: IProps) => {
  const session = useContext(PAGE_COLLECTION_CACHE_CONTEXT);
  const notices = useContext(PAGE_COLLECTION_NOTICES_CONTEXT);
  const [store] = useState(createPageRowStore);
  const [stamp] = useState(createExpectedVersionStamper);
  const [pendingValues] = useState(createPendingValuesStore);

  const queue = useMemo(
    () =>
      session === null
        ? null
        : createViewWriteQueue({
            collectionId,
            newId: () => crypto.randomUUID(),
            onAnswered: (_id, write, answer) => {
              pendingValues.remove(write);
              if (answer.kind !== 'rejected') return;
              window.dispatchEvent(new Event(LOCAL_CACHE_OUTBOX_CHANGED_EVENT));
              notices.requestRefresh('write-rejected');
            },
            onStorageFailure: (error) => {
              browserLogger.error({ err: error }, 'A change could not be kept on disk, so it was not sent');
            },
            outbox: session.outbox,
            ownerId: crypto.randomUUID(),
            scheduleRetry: scheduleViewWriteRetry,
            send: sendViewWrite,
          }),
    [collectionId, notices, pendingValues, session],
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
    const resumeRetried = (event: Event): void => {
      if (event instanceof CustomEvent && typeof event.detail === 'string') queue.release(event.detail);
      resume();
    };
    window.addEventListener(LOCAL_CACHE_OUTBOX_RETRY_EVENT, resumeRetried);
    return () => {
      window.removeEventListener('online', resume);
      window.removeEventListener(LOCAL_CACHE_OUTBOX_RETRY_EVENT, resumeRetried);
    };
  }, [queue]);

  const pendingCount = useSyncExternalStore(
    queue?.subscribe ?? subscribeToNothing,
    () => queue?.pendingCount() ?? 0,
    () => 0,
  );

  const actions = useMemo<PagesViewWriteActions>(() => {
    const stampWithVersion = (write: PageViewWrite): PageViewWrite => {
      const rowId = readWrittenRowId(write);
      const heldVersion = rowId === null ? undefined : store.getRow(rowId)?.version;
      return stamp(write, 'expectedVersion' in write ? (write.expectedVersion ?? heldVersion) : heldVersion);
    };
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
      pendingValues,
      write: async (requested, description): Promise<ViewWriteSettled> => {
        const write = stampWithVersion(requested);
        showOptimistically(write);
        if (queue === null) return writeViewNow(write);
        pendingValues.add(write);
        return queue.enqueue(write, description);
      },
      writeNow: async (requested): Promise<ViewWriteSettled> => {
        const write = stampWithVersion(requested);
        showOptimistically(write);
        const settled = await writeViewNow(write);
        if (settled.kind === 'rejected') notices.requestRefresh('write-rejected');
        return settled;
      },
    };
  }, [notices, pendingValues, queue, stamp, store]);

  const value = useMemo<PagesViewWrites>(
    () => ({
      isPersistent: session?.isPersistent ?? true,
      pendingCount,
      readPendingValue: pendingValues.read,
      write: actions.write,
      writeNow: actions.writeNow,
    }),
    [actions, pendingCount, pendingValues, session],
  );

  return (
    <PAGE_ROW_STORE_CONTEXT value={store}>
      <PAGE_VIEW_WRITE_ACTIONS_CONTEXT value={actions}>
        <PAGE_VIEW_WRITES_CONTEXT value={value}>{children}</PAGE_VIEW_WRITES_CONTEXT>
      </PAGE_VIEW_WRITE_ACTIONS_CONTEXT>
    </PAGE_ROW_STORE_CONTEXT>
  );
};
