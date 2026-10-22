import { describe, expect, it } from 'bun:test';
import { SIDEBAR_TREE_MAX_INDENTED_DEPTH } from '@/modules/portal/constants/sidebar.constants';
import { resolveSpaceToStartPageIn } from '@/modules/portal/lib/portal.keyboard.lib';
import {
  buildPortalSidebarPageTree,
  buildSidebarTreeIndent,
  hasPortalSidebarPageChildren,
  resolvePortalSpaceKind,
  shouldLoadPortalSidebarChildren,
  shouldOfferPortalSidebarNextWindow,
} from '@/modules/portal/lib/portal.sidebar.lib';
import type { PortalSidebarPage } from '@/modules/portal/types/portal.types';

describe('resolveSpaceToStartPageIn', () => {
  const spaces = [{ id: 'alpha' }, { id: 'beta' }];

  it('starts the page where the reader already is', () => {
    expect(resolveSpaceToStartPageIn('/es/spaces/beta/pages/a-page', spaces)).toBe('beta');
  });

  it('falls back to the first space when the address names none', () => {
    expect(resolveSpaceToStartPageIn('/es/search', spaces)).toBe('alpha');
  });

  it('ignores a space that is not the reader own, since a page cannot be started there', () => {
    expect(resolveSpaceToStartPageIn('/es/spaces/gamma/pages/a-page', spaces)).toBe('alpha');
  });

  it('has nowhere to start a page when there are no spaces at all', () => {
    expect(resolveSpaceToStartPageIn('/es/spaces/beta', [])).toBeNull();
  });
});

describe('resolvePortalSpaceKind', () => {
  it('calls a private space of one own only when it belongs to whoever is looking', () => {
    expect(resolvePortalSpaceKind('PRIVATE', 'user-a', 'user-a')).toBe('private');
  });

  it('calls somebody else private space shared, since being in it means being let in', () => {
    expect(resolvePortalSpaceKind('PRIVATE', 'user-b', 'user-a')).toBe('shared');
  });

  it('leaves every other space as one the whole place shares', () => {
    expect(resolvePortalSpaceKind('PUBLIC_INTERNAL', null, 'user-a')).toBe('own');
    expect(resolvePortalSpaceKind('RESTRICTED', null, 'user-a')).toBe('own');
  });
});

describe('buildSidebarTreeIndent', () => {
  it('steps the indentation in once per generation', () => {
    const root = buildSidebarTreeIndent(0);
    const child = buildSidebarTreeIndent(1);
    const grandchild = buildSidebarTreeIndent(2);

    expect(child - root).toBe(grandchild - child);
    expect(child).toBeGreaterThan(root);
  });

  it('stops stepping in once a branch runs deep, so the names keep their room', () => {
    const last = buildSidebarTreeIndent(SIDEBAR_TREE_MAX_INDENTED_DEPTH);
    const deeper = buildSidebarTreeIndent(SIDEBAR_TREE_MAX_INDENTED_DEPTH + 4);

    expect(deeper).toBe(last);
  });
});

const sidebarPage = (id: string, parentId: string | null, hasChildren?: boolean): PortalSidebarPage => ({
  hasChildren,
  icon: null,
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId,
  title: id,
});

describe('buildPortalSidebarPageTree', () => {
  const trashed: PortalSidebarPage = { ...sidebarPage('gone', null), lifecycle: 'TRASHED' };

  it('leaves out the pages in the trash, which have their own screen', () => {
    const tree = buildPortalSidebarPageTree([sidebarPage('kept', null), trashed]);

    expect(tree.map((item) => item.page.id)).toEqual(['kept']);
  });

  it('keeps the page in the trash that is open, so the person sees where they are', () => {
    const tree = buildPortalSidebarPageTree([sidebarPage('kept', null), trashed], 'gone');

    expect(tree.map((item) => item.page.id)).toEqual(['kept', 'gone']);
  });
});

describe('hasPortalSidebarPageChildren', () => {
  it('shows the chevron from the flag, before any child is loaded', () => {
    expect(hasPortalSidebarPageChildren(sidebarPage('a', null, true), 0)).toBe(true);
  });

  it('shows the chevron once a child is loaded, whatever the flag says', () => {
    expect(hasPortalSidebarPageChildren(sidebarPage('a', null, false), 2)).toBe(true);
  });

  it('shows no chevron for a page with no children at all', () => {
    expect(hasPortalSidebarPageChildren(sidebarPage('a', null), 0)).toBe(false);
  });
});

describe('shouldOfferPortalSidebarNextWindow', () => {
  it('offers more while the loaded children do not reach the end', () => {
    expect(shouldOfferPortalSidebarNextWindow(true, 100, false)).toBe(true);
  });

  it('shows the arriving state when none has arrived yet', () => {
    expect(shouldOfferPortalSidebarNextWindow(false, 0, true)).toBe(true);
  });

  it('offers nothing when the children are complete', () => {
    expect(shouldOfferPortalSidebarNextWindow(false, 12, false)).toBe(false);
    expect(shouldOfferPortalSidebarNextWindow(false, 12, true)).toBe(false);
  });
});

describe('shouldLoadPortalSidebarChildren', () => {
  const pages = [sidebarPage('a', null, true), sidebarPage('a1', 'a'), sidebarPage('b', null, true)];

  it('asks for the children of a page that was never opened', () => {
    expect(shouldLoadPortalSidebarChildren(pages, new Set(), 'b')).toBe(true);
  });

  it('does not ask again for children already read', () => {
    expect(shouldLoadPortalSidebarChildren(pages, new Set(), 'a')).toBe(false);
  });

  it('does not ask when the page is being closed', () => {
    expect(shouldLoadPortalSidebarChildren(pages, new Set(['b']), 'b')).toBe(false);
  });
});
