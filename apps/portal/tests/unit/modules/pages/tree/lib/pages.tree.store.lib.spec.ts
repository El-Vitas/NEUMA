import { describe, expect, it } from 'bun:test';
import { selectPageTreeEntries } from '@/modules/pages/tree/lib/pages.tree.lib';
import { createPageTreeStore } from '@/modules/pages/tree/lib/pages.tree.store.lib';
import type {
  PageTreeChildren,
  PageTreeEntry,
  PageTreeStore,
  PageTreeWindowRequest,
} from '@/modules/pages/tree/types/pages.tree.types';
import { buildRecordedPageTreeStore } from '../../stubs/pages.tree.stubs';

const SPACE_ID = 'space-1';

const entry = (id: string, parentId: string | null, hasChildren = false): PageTreeEntry => ({
  canEdit: true,
  hasChildren,
  hasOwnPermissions: false,
  icon: null,
  id,
  isCollection: false,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId,
  title: id,
  version: 1,
});

const children = (ids: readonly string[], parentId: string | null, total = ids.length): PageTreeChildren => ({
  entries: ids.map((id) => entry(id, parentId)),
  total,
});

const buildStore = (answer: (request: PageTreeWindowRequest) => PageTreeChildren | null) =>
  buildRecordedPageTreeStore(answer);

const loadedIds = (store: PageTreeStore): string[] =>
  selectPageTreeEntries(store.getState().spaces[SPACE_ID] ?? { branches: {}, entries: {} }).map((page) => page.id);

describe('createPageTreeStore', () => {
  it('seeds the top of a space and tells the listeners', () => {
    const { store } = buildStore(() => null);
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });

    store.seedRoots(SPACE_ID, children(['a', 'b'], null));

    expect(loadedIds(store)).toEqual(['a', 'b']);
    expect(notified).toBe(1);
  });

  it('reads the first window of a page when it opens', async () => {
    const { requests, store } = buildStore((request) => children(['a1'], request.parentId));
    store.seedRoots(SPACE_ID, { entries: [entry('a', null, true)], total: 1 });

    await store.loadChildren(SPACE_ID, 'a');

    expect(requests).toEqual([[{ parentId: 'a', skip: 0, take: 100 }]]);
    expect(loadedIds(store)).toEqual(['a', 'a1']);
  });

  it('reads the window after the last one loaded when asked for more', async () => {
    const { requests, store } = buildStore((request) => children(['r2', 'r3'], request.parentId, 4));
    store.seedRoots(SPACE_ID, children(['r0', 'r1'], null, 4));

    await store.loadMore(SPACE_ID, null, 'next');

    expect(requests).toEqual([[{ parentId: null, skip: 2, take: 100 }]]);
    expect(loadedIds(store)).toEqual(['r0', 'r1', 'r2', 'r3']);
  });

  it('reads the window before the first one loaded when asked for the previous', async () => {
    const { requests, store } = buildStore((request) => children(['r0', 'r1'], request.parentId, 4));
    store.seedLevels(SPACE_ID, [{ ...children(['r2', 'r3'], null, 4), parentId: null, skip: 2 }]);

    await store.loadMore(SPACE_ID, null, 'previous');

    expect(requests).toEqual([[{ parentId: null, skip: 0, take: 2 }]]);
    expect(loadedIds(store)).toEqual(['r0', 'r1', 'r2', 'r3']);
  });

  it('marks a parent as loading while it is read', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const store = createPageTreeStore({
      readWindows: async (_spaceId, asked) => {
        await gate;
        return asked.map((request) => children(['a1'], request.parentId));
      },
    });
    store.seedRoots(SPACE_ID, { entries: [entry('a', null, true)], total: 1 });

    const reading = store.loadChildren(SPACE_ID, 'a');
    const whileReading = store.getState().loadingKeys;
    release();
    await reading;

    expect(whileReading).toEqual([`${SPACE_ID}:a`]);
    expect(store.getState().loadingKeys).toEqual([]);
  });

  it('keeps what is shown when the backend cannot be reached', async () => {
    const { store } = buildStore(() => null);
    store.seedRoots(SPACE_ID, { entries: [entry('a', null, true)], total: 1 });

    await store.loadChildren(SPACE_ID, 'a');

    expect(loadedIds(store)).toEqual(['a']);
    expect(store.getState().loadingKeys).toEqual([]);
  });

  it('reads again only the branches named, and not the ones that are not open', async () => {
    const { requests, store } = buildStore((request) =>
      request.parentId === 'a' ? children(['a1', 'a2'], 'a') : children(['a', 'b'], null),
    );
    store.seedRoots(SPACE_ID, { entries: [entry('a', null, true), entry('b', null, true)], total: 2 });
    store.seedLevels(SPACE_ID, [{ ...children(['a1'], 'a'), parentId: 'a', skip: 0 }]);

    await store.reloadParents(SPACE_ID, ['a', 'x']);

    expect(requests).toEqual([[{ parentId: 'a', skip: 0, take: 100 }]]);
    expect(loadedIds(store)).toEqual(['a', 'b', 'a1', 'a2']);
  });

  it('reads every open branch when the whole space is asked again', async () => {
    const { requests, store } = buildStore((request) =>
      request.parentId === 'a' ? children(['a1'], 'a') : children(['a'], null),
    );
    store.seedRoots(SPACE_ID, { entries: [entry('a', null, true), entry('b', null)], total: 2 });
    store.seedLevels(SPACE_ID, [{ ...children(['a1', 'a2'], 'a'), parentId: 'a', skip: 0 }]);

    await store.reloadSpace(SPACE_ID);

    expect(requests[0]).toEqual([
      { parentId: null, skip: 0, take: 100 },
      { parentId: 'a', skip: 0, take: 100 },
    ]);
    expect(loadedIds(store)).toEqual(['a', 'a1']);
  });

  it('ignores a reload that answers after a newer one', async () => {
    const gates: (() => void)[] = [];
    let call = 0;
    const store = createPageTreeStore({
      readWindows: async (_spaceId, asked) => {
        call += 1;
        const current = call;
        await new Promise<void>((resolve) => gates.push(resolve));
        return asked.map((request) => children(current === 1 ? ['old'] : ['new'], request.parentId));
      },
    });
    store.seedRoots(SPACE_ID, children(['first'], null));

    const older = store.reloadSpace(SPACE_ID);
    const newer = store.reloadSpace(SPACE_ID);
    gates[1]?.();
    await newer;
    gates[0]?.();
    await older;

    expect(loadedIds(store)).toEqual(['new']);
  });

  it('reads a window again when a reload landed while it was loading', async () => {
    let call = 0;
    let releaseSlowLoad: () => void = () => undefined;
    const store = createPageTreeStore({
      readWindows: async (_spaceId, asked) => {
        call += 1;
        const current = call;
        if (current === 1) await new Promise<void>((resolve) => (releaseSlowLoad = resolve));
        return asked.map((request) =>
          request.parentId === null
            ? children(['a'], null)
            : children(current === 1 ? ['stale'] : ['fresh'], request.parentId),
        );
      },
    });
    store.seedRoots(SPACE_ID, { entries: [entry('a', null, true)], total: 1 });

    const loading = store.loadChildren(SPACE_ID, 'a');
    await store.reloadSpace(SPACE_ID);
    releaseSlowLoad();
    await loading;

    expect(loadedIds(store)).not.toContain('stale');
  });
});
