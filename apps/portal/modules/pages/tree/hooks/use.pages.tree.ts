'use client';

import { useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import type { PageReference } from '../../types/pages.types';
import { PAGES_TREE_STORE_CONTEXT } from '../constants/pages.tree.context.constants';
import {
  createEmptyPageTreeSpace,
  readPageTreeBranchBounds,
  selectPageTreeEntries,
  toPageTreeBranchKey,
} from '../lib/pages.tree.lib';
import { createPageTreeStore } from '../lib/pages.tree.store.lib';
import type { PagesTreeSpaceView, PageTreeDirection, PageTreeStore } from '../types/pages.tree.types';

export const usePagesTreeStore = (): PageTreeStore => {
  const store = useContext(PAGES_TREE_STORE_CONTEXT);
  if (store === null) throw new Error('The page tree was read outside of a PagesTreeProvider');
  return store;
};

const createStoreThatReadsNothing = (): PageTreeStore =>
  createPageTreeStore({ readWindows: () => Promise.resolve(null) });

/**
 * The tree when there is one, and a store of its own that nobody fills when the page is drawn without a sidebar
 * (a test, a standalone view): what only helps the sidebar then has nothing to help.
 */
export const useOptionalPagesTreeStore = (): PageTreeStore => {
  const store = useContext(PAGES_TREE_STORE_CONTEXT);
  const [fallback] = useState(createStoreThatReadsNothing);
  return store ?? fallback;
};

/** The pages of this space that the sidebar has loaded, as names to offer when a mention or a link is written. */
export const usePagesTreeSuggestions = (spaceId: string): readonly PageReference[] => {
  const store = useOptionalPagesTreeStore();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const space = state.spaces[spaceId];
  return useMemo(
    () =>
      space === undefined
        ? []
        : selectPageTreeEntries(space).map(({ icon, id, lifecycle, title }) => ({
            icon,
            id,
            lifecycle,
            spaceId,
            title,
          })),
    [space, spaceId],
  );
};

/** What the sidebar shows of one space, and the ways to ask for more of it. */
export const usePagesTreeSpace = (spaceId: string): PagesTreeSpaceView => {
  const store = usePagesTreeStore();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const space = state.spaces[spaceId] ?? createEmptyPageTreeSpace();
  const entries = useMemo(() => selectPageTreeEntries(space), [space]);
  const loadingKeys = state.loadingKeys;

  const isLoading = useCallback(
    (parentId: string | null): boolean => loadingKeys.includes(`${spaceId}:${toPageTreeBranchKey(parentId)}`),
    [loadingKeys, spaceId],
  );
  const loadChildren = useCallback(
    (parentId: string | null): void => {
      void store.loadChildren(spaceId, parentId);
    },
    [spaceId, store],
  );
  const loadMore = useCallback(
    (parentId: string | null, direction: PageTreeDirection): void => {
      void store.loadMore(spaceId, parentId, direction);
    },
    [spaceId, store],
  );
  const readBounds = useCallback((parentId: string | null) => readPageTreeBranchBounds(space, parentId), [space]);

  return { entries, isLoading, loadChildren, loadMore, readBounds };
};
