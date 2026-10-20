import { describe, expect, it } from 'bun:test';
import type { BlockCommit, BlockCommitListener } from '@/common/types/block-writer.types';
import { PAGE_VERSION_IDLE_MS, PAGE_VERSION_MAX_WAIT_MS } from '@/modules/pages/constants/pages.constants';
import { PageVersionScheduler } from '@/modules/pages/infrastructure/schedulers/page.version.scheduler';
import type { PageVersionClock } from '@/modules/pages/types/page.version.types';

/** Time that only moves when the test says so. */
const createClock = () => {
  let now = 0;
  const timers = new Map<number, { readonly at: number; readonly work: () => void }>();
  let nextId = 0;
  const clock: PageVersionClock = {
    after: (milliseconds, work) => {
      nextId += 1;
      const id = nextId;
      timers.set(id, { at: now + milliseconds, work });
      return () => {
        timers.delete(id);
      };
    },
  };
  const advance = (milliseconds: number): void => {
    const target = now + milliseconds;
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .toSorted(([, a], [, b]) => a.at - b.at);
      const first = due[0];
      if (first === undefined) break;
      timers.delete(first[0]);
      now = first[1].at;
      first[1].work();
    }
    now = target;
  };
  return { advance, clock, pending: () => timers.size };
};

const build = (
  ownersOf: (blockIds: readonly string[]) => string[] = (blockIds) => [`page-of-${blockIds[0] ?? ''}`],
) => {
  const fake = createClock();
  const recorded: string[] = [];
  let listener: BlockCommitListener = () => undefined;
  const scheduler = new PageVersionScheduler(
    {
      subscribe: (added) => {
        listener = added;
        return () => undefined;
      },
    },
    { findOwningPageIds: (blockIds) => Promise.resolve(ownersOf(blockIds)) },
    {
      record: (pageId, authorId) => {
        recorded.push(`${pageId}:${authorId}`);
        return Promise.resolve();
      },
    },
    fake.clock,
    { error: () => undefined },
  );
  scheduler.onModuleInit();
  const commit = (commitment: Partial<BlockCommit> = {}): void => {
    listener({ blockIds: ['b1'], spaceId: 'space-1', userId: 'user-1', ...commitment });
  };
  const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
  return { advance: fake.advance, commit, pending: fake.pending, recorded, scheduler, settle };
};

describe('the history of a page written by the editor', () => {
  it('cuts a version once the editor has been quiet for a moment', async () => {
    const { advance, commit, recorded, settle } = build();

    commit();
    advance(PAGE_VERSION_IDLE_MS - 1);
    await settle();
    expect(recorded).toEqual([]);

    advance(1);
    await settle();
    expect(recorded).toEqual(['page-of-b1:user-1']);
  });

  it('waits more while the editor keeps writing, up to a ceiling', async () => {
    const { advance, commit, recorded, settle } = build();

    for (let elapsed = 0; elapsed < PAGE_VERSION_MAX_WAIT_MS; elapsed += PAGE_VERSION_IDLE_MS - 50) {
      commit();
      advance(PAGE_VERSION_IDLE_MS - 50);
    }
    await settle();

    expect(recorded).toEqual(['page-of-b1:user-1']);
  });

  it('cuts one version for the many transactions of one stretch', async () => {
    const { advance, commit, recorded, settle } = build();

    commit();
    commit({ blockIds: ['b1', 'b2'] });
    commit();
    advance(PAGE_VERSION_IDLE_MS);
    await settle();

    expect(recorded).toHaveLength(1);
  });

  it('keeps a stretch apart for each writer, and starts a new one after a flush', async () => {
    const { advance, commit, recorded, settle } = build();

    commit({ userId: 'user-1' });
    commit({ userId: 'user-2' });
    advance(PAGE_VERSION_IDLE_MS);
    await settle();
    commit({ userId: 'user-1' });
    advance(PAGE_VERSION_IDLE_MS);
    await settle();

    expect(recorded.toSorted()).toEqual(['page-of-b1:user-1', 'page-of-b1:user-1', 'page-of-b1:user-2']);
  });

  it('cuts a version for each page a transaction touched', async () => {
    const { advance, commit, recorded, settle } = build(() => ['page-a', 'page-b']);

    commit();
    advance(PAGE_VERSION_IDLE_MS);
    await settle();

    expect(recorded.toSorted()).toEqual(['page-a:user-1', 'page-b:user-1']);
  });

  it('cuts what is waiting when the backend shuts down, and leaves no timer behind', async () => {
    const { commit, pending, recorded, scheduler } = build();

    commit();
    await scheduler.beforeApplicationShutdown();

    expect(recorded).toEqual(['page-of-b1:user-1']);
    expect(pending()).toBe(0);
  });

  it('keeps going when a version could not be cut', async () => {
    const fake = createClock();
    const recorded: string[] = [];
    let listener: BlockCommitListener = () => undefined;
    const scheduler = new PageVersionScheduler(
      {
        subscribe: (added) => {
          listener = added;
          return () => undefined;
        },
      },
      { findOwningPageIds: () => Promise.resolve(['page-a', 'page-b']) },
      {
        record: (pageId) => {
          if (pageId === 'page-a') return Promise.reject(new Error('the database went away'));
          recorded.push(pageId);
          return Promise.resolve();
        },
      },
      fake.clock,
      { error: () => undefined },
    );
    scheduler.onModuleInit();

    listener({ blockIds: ['b1'], spaceId: 'space-1', userId: 'user-1' });
    await scheduler.beforeApplicationShutdown();

    expect(recorded).toEqual(['page-b']);
  });
});
