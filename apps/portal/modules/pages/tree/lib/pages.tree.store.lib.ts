import {
  PAGE_TREE_INITIAL_STORE_STATE,
  PAGE_TREE_MAX_WINDOW_SIZE,
  PAGE_TREE_WINDOW_SIZE,
} from '../constants/pages.tree.constants';
import type {
  PageTreeChildren,
  PageTreeEntry,
  PageTreeLevel,
  PageTreeSpaceRoots,
  PageTreeState,
  PageTreeStore,
  PageTreeStoreOptions,
  PageTreeStoreState,
  PageTreeWindowRequest,
} from '../types/pages.tree.types';
import {
  appendPageTreeEntry,
  createEmptyPageTreeSpace,
  listPageTreeReloadWindows,
  mergePageTreeWindow,
  toPageTreeBranchKey,
} from './pages.tree.lib';

const toLoadingKey = (spaceId: string, parentId: string | null): string =>
  `${spaceId}:${toPageTreeBranchKey(parentId)}`;

/**
 * The windows of the page tree that the sidebar has open, per space (ADR 030). It reads through `readWindows`, so a
 * failed read leaves what is shown as it is, and a reload that arrives late cannot undo a newer one.
 */
export const createPageTreeStore = ({ readWindows }: PageTreeStoreOptions): PageTreeStore => {
  let state: PageTreeStoreState = PAGE_TREE_INITIAL_STORE_STATE;
  const listeners = new Set<() => void>();
  const reloadTickets = new Map<string, number>();

  const publish = (next: PageTreeStoreState): void => {
    state = next;
    for (const listener of listeners) listener();
  };

  const withSpaces = (spaces: PageTreeState): PageTreeStoreState => ({ ...state, spaces });

  const readSpace = (spaceId: string) => state.spaces[spaceId] ?? createEmptyPageTreeSpace();

  const mergeWindows = (
    spaceId: string,
    windows: readonly { readonly children: PageTreeChildren; readonly request: PageTreeWindowRequest }[],
  ): void => {
    const merged = windows.reduce(
      (space, { children, request }) => mergePageTreeWindow(space, request.parentId, request.skip, children),
      readSpace(spaceId),
    );
    publish(withSpaces({ ...state.spaces, [spaceId]: merged }));
  };

  const setLoading = (key: string, isLoading: boolean): void => {
    const others = state.loadingKeys.filter((candidate) => candidate !== key);
    publish({ ...state, loadingKeys: isLoading ? [...others, key] : others });
  };

  const fetchWindows = async (
    spaceId: string,
    requests: readonly PageTreeWindowRequest[],
  ): Promise<readonly PageTreeChildren[] | null> => {
    const batches = Array.from({ length: Math.ceil(requests.length / 20) }, (_, index) =>
      requests.slice(index * 20, (index + 1) * 20),
    );
    const answers: PageTreeChildren[] = [];
    for (const batch of batches) {
      const read = await readWindows(spaceId, batch);
      if (read === null) return null;
      answers.push(...read);
    }
    return answers;
  };

  const loadWindow = async (spaceId: string, request: PageTreeWindowRequest): Promise<void> => {
    const key = toLoadingKey(spaceId, request.parentId);
    setLoading(key, true);
    try {
      const answers = await fetchWindows(spaceId, [request]);
      const children = answers?.[0];
      if (children !== undefined) mergeWindows(spaceId, [{ children, request }]);
    } finally {
      setLoading(key, false);
    }
  };

  const reloadWindows = async (spaceId: string, requests: readonly PageTreeWindowRequest[]): Promise<void> => {
    if (requests.length === 0) return;
    const ticket = (reloadTickets.get(spaceId) ?? 0) + 1;
    reloadTickets.set(spaceId, ticket);
    const answers = await fetchWindows(spaceId, requests);
    if (answers === null || reloadTickets.get(spaceId) !== ticket) return;
    mergeWindows(
      spaceId,
      requests.map((request, index) => ({ children: answers[index] ?? { entries: [], total: 0 }, request })),
    );
  };

  const seedLevels = (spaceId: string, levels: readonly PageTreeLevel[]): void => {
    if (levels.length === 0) return;
    mergeWindows(
      spaceId,
      levels.map((level) => ({
        children: { entries: level.entries, total: level.total },
        request: { parentId: level.parentId, skip: level.skip, take: level.entries.length },
      })),
    );
  };

  const seedOpenPage = (spaceId: string, entry: PageTreeEntry): void => {
    const space = readSpace(spaceId);
    const withEntry = appendPageTreeEntry(space, entry);
    if (withEntry !== space) publish(withSpaces({ ...state.spaces, [spaceId]: withEntry }));
  };

  const readLoadedNextSkip = (spaceId: string, parentId: string | null): number => {
    const branch = readSpace(spaceId).branches[toPageTreeBranchKey(parentId)];
    return branch === undefined ? 0 : branch.offset + branch.ids.length;
  };

  const readLoadedPreviousWindow = (
    spaceId: string,
    parentId: string | null,
  ): { readonly skip: number; readonly take: number } => {
    const offset = readSpace(spaceId).branches[toPageTreeBranchKey(parentId)]?.offset ?? 0;
    const skip = Math.max(0, offset - PAGE_TREE_WINDOW_SIZE);
    return { skip, take: Math.min(PAGE_TREE_MAX_WINDOW_SIZE, offset - skip) };
  };

  return {
    getState: () => state,
    loadChildren: (spaceId, parentId) => loadWindow(spaceId, { parentId, skip: 0, take: PAGE_TREE_WINDOW_SIZE }),
    loadMore: (spaceId, parentId, direction) =>
      direction === 'next'
        ? loadWindow(spaceId, { parentId, skip: readLoadedNextSkip(spaceId, parentId), take: PAGE_TREE_WINDOW_SIZE })
        : loadWindow(spaceId, { parentId, ...readLoadedPreviousWindow(spaceId, parentId) }),
    reloadParents: (spaceId, parentIds) => {
      const wanted = new Set(parentIds.map(toPageTreeBranchKey));
      const requests = listPageTreeReloadWindows(readSpace(spaceId)).filter((request) =>
        wanted.has(toPageTreeBranchKey(request.parentId)),
      );
      return reloadWindows(spaceId, requests);
    },
    reloadSpace: (spaceId) => reloadWindows(spaceId, listPageTreeReloadWindows(readSpace(spaceId))),
    seedLevels,
    seedOpenPage,
    seedRoots: (spaceId, roots) => seedLevels(spaceId, [{ ...roots, parentId: null, skip: 0 }]),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

/** A store that already holds the top of each space, so the sidebar draws on the server with what it will keep. */
export const createSeededPageTreeStore = (
  readWindows: PageTreeStoreOptions['readWindows'],
  spaces: readonly PageTreeSpaceRoots[],
): PageTreeStore => {
  const store = createPageTreeStore({ readWindows });
  for (const space of spaces) store.seedRoots(space.id, space.roots);
  return store;
};
