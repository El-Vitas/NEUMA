import { describe, expect, it } from 'bun:test';
import { render } from '@testing-library/react';
import { PagesTreePathSeed } from '@/modules/pages/tree/components/pages.tree.path-seed';
import { selectPageTreeEntries } from '@/modules/pages/tree/lib/pages.tree.lib';
import type { PageTreeEntry } from '@/modules/pages/tree/types/pages.tree.types';
import { buildSeededPageTreeStore, PagesTreeStoreStub } from '../stubs/pages.tree.stubs';

const SPACE_ID = 'space-1';

const entry = (id: string, parentId: string | null, lifecycle: 'ACTIVE' | 'TRASHED' = 'ACTIVE'): PageTreeEntry => ({
  canEdit: true,
  hasChildren: false,
  hasOwnPermissions: false,
  icon: null,
  id,
  isCollection: false,
  lifecycle,
  order: 0,
  parentId,
  title: id,
  version: 1,
});

const renderSeed = (props: Partial<Parameters<typeof PagesTreePathSeed>[0]>) => {
  const store = buildSeededPageTreeStore(SPACE_ID, []);
  render(
    <PagesTreeStoreStub store={store}>
      <PagesTreePathSeed levels={[]} openPage={null} spaceId={SPACE_ID} {...props} />
    </PagesTreeStoreStub>,
  );
  return store;
};

const listedIds = (store: ReturnType<typeof buildSeededPageTreeStore>): string[] =>
  selectPageTreeEntries(store.getState().spaces[SPACE_ID] ?? { branches: {}, entries: {} }).map((page) => page.id);

describe('PagesTreePathSeed', () => {
  it('hands the windows that show the open page to the sidebar', () => {
    const store = renderSeed({ levels: [{ entries: [entry('a', null)], parentId: null, skip: 0, total: 1 }] });

    expect(listedIds(store)).toEqual(['a']);
  });

  it('lists the open page when it is in the trash, which no window holds', () => {
    const trashed = entry('gone', null, 'TRASHED');
    const store = renderSeed({
      levels: [{ entries: [entry('a', null)], parentId: null, skip: 0, total: 1 }],
      openPage: trashed,
    });

    expect(listedIds(store)).toEqual(['a', 'gone']);
  });

  it('does not add an open page that is not in the trash, since its window already holds it', () => {
    const store = renderSeed({
      levels: [{ entries: [entry('a', null)], parentId: null, skip: 0, total: 1 }],
      openPage: entry('a', null),
    });

    expect(listedIds(store)).toEqual(['a']);
  });
});
