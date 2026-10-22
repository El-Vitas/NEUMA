import type { ReactNode } from 'react';
import { PAGES_TREE_STORE_CONTEXT } from '@/modules/pages/tree/constants/pages.tree.context.constants';
import { createPageTreeStore } from '@/modules/pages/tree/lib/pages.tree.store.lib';
import type {
  PageTreeChildren,
  PageTreeEntry,
  PageTreeStore,
  PageTreeWindowRequest,
} from '@/modules/pages/tree/types/pages.tree.types';
import type { PortalSidebarPage } from '@/modules/portal/types/portal.types';

type Reader = (
  spaceId: string,
  requests: readonly PageTreeWindowRequest[],
) => Promise<readonly PageTreeChildren[] | null>;

const toEntry = (page: PortalSidebarPage, hasChildren: boolean): PageTreeEntry => ({
  hasChildren: page.hasChildren ?? hasChildren,
  hasOwnPermissions: page.hasOwnPermissions ?? false,
  icon: page.icon,
  id: page.id,
  isCollection: false,
  lifecycle: page.lifecycle,
  order: page.order,
  parentId: page.parentId,
  title: page.title,
  version: 1,
});

/** Loads these pages of a space into a sidebar, every one of them; trashed pages never reach a real one. */
export const seedPageTreeSpace = (store: PageTreeStore, spaceId: string, pages: readonly PortalSidebarPage[]): void => {
  const active = pages.filter((page) => page.lifecycle === 'ACTIVE');
  const parentIds = new Set(active.map((page) => page.parentId));
  const nestedParentIds = [...parentIds].filter((parentId): parentId is string => parentId !== null);
  const parentKeys: (string | null)[] = [...(parentIds.has(null) ? [null] : []), ...nestedParentIds];
  store.seedLevels(
    spaceId,
    parentKeys.map((parentId) => {
      const siblings = active.filter((page) => page.parentId === parentId).toSorted((a, b) => a.order - b.order);
      return {
        entries: siblings.map((page) => toEntry(page, parentIds.has(page.id))),
        parentId,
        skip: 0,
        total: siblings.length,
      };
    }),
  );
};

export const buildSeededPageTreeStore = (
  spaceId: string,
  pages: readonly PortalSidebarPage[],
  readWindows: Reader = () => Promise.resolve(null),
): PageTreeStore => {
  const store = createPageTreeStore({ readWindows });
  seedPageTreeSpace(store, spaceId, pages);
  return store;
};

/** A store whose reads are answered by a function and remembered, so a test can say what was asked. */
export interface RecordedPageTreeStore {
  readonly requests: PageTreeWindowRequest[][];
  readonly store: PageTreeStore;
}

export const buildRecordedPageTreeStore = (
  answer: (request: PageTreeWindowRequest) => PageTreeChildren | null,
): RecordedPageTreeStore => {
  const requests: PageTreeWindowRequest[][] = [];
  const store = createPageTreeStore({
    readWindows: (_spaceId, asked) => {
      requests.push([...asked]);
      const answers = asked.map(answer);
      return Promise.resolve(answers.some((one) => one === null) ? null : (answers as PageTreeChildren[]));
    },
  });
  return { requests, store };
};

interface IProps {
  readonly children: ReactNode;
  readonly store: PageTreeStore;
}

export const PagesTreeStoreStub = ({ children, store }: IProps) => (
  <PAGES_TREE_STORE_CONTEXT value={store}>{children}</PAGES_TREE_STORE_CONTEXT>
);
