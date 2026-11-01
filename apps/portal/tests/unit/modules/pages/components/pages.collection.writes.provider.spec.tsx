import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useContext } from 'react';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '@/modules/pages/collections/constants/pages.collection-notices.context.constants';
import { PAGE_COLLECTION_CACHE_CONTEXT } from '@/modules/pages/collections/constants/pages.view-cache.context.constants';
import type { PagesCollectionNotices } from '@/modules/pages/collections/types/pages.collection-live.types';
import type { PageRow } from '@/modules/pages/collections/types/pages.schema.types';
import type {
  CachedRowBody,
  PagesCollectionCacheSession,
} from '@/modules/pages/collections/types/pages.view-cache.types';
import type { PageViewWrite, ViewWriteSendResult } from '@/modules/pages/collections/types/pages.view-writes.types';
import { createMemoryStorage } from '@/modules/pages/local-cache/lib/local-cache.memory-storage.lib';
import { createOutbox } from '@/modules/pages/local-cache/lib/local-cache.outbox.lib';
import { openLocalCache } from '@/modules/pages/local-cache/lib/local-cache.store.lib';

const sent: PageViewWrite[] = [];
let answers: ViewWriteSendResult[] = [];

mock.module('@/modules/pages/collections/lib/pages.view-writes.send.lib', () => ({
  sendViewWrite: async (write: PageViewWrite): Promise<ViewWriteSendResult> => {
    sent.push(write);
    return answers.shift() ?? { kind: 'applied' };
  },
}));

const { PagesCollectionWritesProvider } = await import(
  '@/modules/pages/collections/components/pages.collection.writes.provider'
);
const { PAGE_ROW_STORE_CONTEXT, PAGE_VIEW_WRITES_CONTEXT } = await import(
  '@/modules/pages/collections/constants/pages.view-writes.context.constants'
);

const row: PageRow = {
  id: 'row-1',
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: { status: 'todo' },
  spaceId: 'space-1',
  title: 'First',
};

const cell: PageViewWrite = { kind: 'cell', pageId: 'row-1', propertyValues: { status: 'done' }, spaceId: 'space-1' };

const openSession = async (): Promise<PagesCollectionCacheSession> => {
  const bundle = createMemoryStorage<CachedRowBody>();
  const cache = await openLocalCache({
    budgetBytes: 1_000_000,
    now: Date.now,
    storage: bundle.cache,
    userId: 'user-1',
  });
  return {
    cache,
    isPersistent: true,
    outbox: createOutbox({ now: Date.now, storage: bundle.outbox }),
    userId: 'user-1',
  };
};

const createNotices = () => {
  const refreshes: string[] = [];
  const notices: PagesCollectionNotices = {
    dispatch: () => undefined,
    requestRefresh: (reason) => {
      refreshes.push(reason);
    },
    subscribe: () => () => undefined,
    subscribeStale: () => () => undefined,
  };
  return { notices, refreshes };
};

const renderWrites = async (session: PagesCollectionCacheSession, fixture = createNotices()) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <PAGE_COLLECTION_NOTICES_CONTEXT value={fixture.notices}>
      <PAGE_COLLECTION_CACHE_CONTEXT value={session}>
        <PagesCollectionWritesProvider collectionId="collection-1">{children}</PagesCollectionWritesProvider>
      </PAGE_COLLECTION_CACHE_CONTEXT>
    </PAGE_COLLECTION_NOTICES_CONTEXT>
  );
  const rendered = renderHook(
    () => ({ store: useContext(PAGE_ROW_STORE_CONTEXT), writes: useContext(PAGE_VIEW_WRITES_CONTEXT) }),
    {
      wrapper: Wrapper,
    },
  );
  await act(async () => {
    await Promise.resolve();
  });
  return { ...rendered, ...fixture };
};

describe('PagesCollectionWritesProvider', () => {
  beforeEach(() => {
    sent.length = 0;
    answers = [];
  });

  it('sends a change and leaves nothing on disk once the server applied it', async () => {
    const session = await openSession();
    const { result } = await renderWrites(session);

    const settled = await act(async () => result.current.writes.write(cell, 'Status: done'));

    expect(settled).toEqual({ kind: 'applied' });
    expect(sent).toEqual([cell]);
    expect(await session.outbox.listPending()).toEqual([]);
  });

  it('shows a change on the rows held at once, before the server answers', async () => {
    const session = await openSession();
    answers = [{ kind: 'offline' }];
    const { result } = await renderWrites(session);
    act(() => result.current.store?.upsertRows([row]));

    await act(async () => {
      await result.current.writes.write(cell, 'Status: done');
    });

    expect(result.current.store?.getRow('row-1')?.propertyValues).toEqual({ status: 'done' });
  });

  it('keeps a change the network did not carry, counts it, and still shows its value in the cell', async () => {
    const session = await openSession();
    answers = [{ kind: 'offline' }];
    const { result } = await renderWrites(session);

    const settled = await act(async () => result.current.writes.write(cell, 'Status: done'));

    expect(settled).toEqual({ kind: 'queued' });
    await waitFor(() => expect(result.current.writes.pendingCount).toBe(1));
    expect(result.current.writes.readPendingValue('row-1', 'status')).toBe('done');
    expect(result.current.writes.readPendingValue('row-2', 'status')).toBeUndefined();
    expect((await session.outbox.listPending()).map((stored) => stored.kind)).toEqual(['view-write']);
  });

  it('sends the pending changes again when the network comes back', async () => {
    const session = await openSession();
    answers = [{ kind: 'offline' }];
    const { result } = await renderWrites(session);
    await act(async () => {
      await result.current.writes.write(cell, 'Status: done');
    });

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    await waitFor(() => expect(result.current.writes.pendingCount).toBe(0));
    expect(sent).toHaveLength(2);
    expect(await session.outbox.listPending()).toEqual([]);
    expect(result.current.writes.readPendingValue('row-1', 'status')).toBeUndefined();
  });

  it('sets a refused change aside with its words and asks for the rows to be read again', async () => {
    const session = await openSession();
    answers = [{ cause: 'forbidden', kind: 'rejected', message: 'forbidden' }];
    const { refreshes, result } = await renderWrites(session);

    const settled = await act(async () => result.current.writes.write(cell, 'Status: done'));

    expect(settled).toMatchObject({ cause: 'forbidden', kind: 'rejected' });
    expect(refreshes).toEqual(['write-rejected']);
    const [rejected] = await session.outbox.listRejected();
    expect(rejected?.previews[0]?.text).toBe('Status: done');
  });

  it('refuses at once a change that needs the network when there is none, and keeps nothing', async () => {
    const session = await openSession();
    answers = [{ kind: 'offline' }];
    const { refreshes, result } = await renderWrites(session);

    const settled = await act(async () => result.current.writes.writeNow(cell));

    expect(settled).toMatchObject({ kind: 'rejected', message: 'offline' });
    expect(await session.outbox.listPending()).toEqual([]);
    expect(refreshes).toEqual(['write-rejected']);
  });
});
