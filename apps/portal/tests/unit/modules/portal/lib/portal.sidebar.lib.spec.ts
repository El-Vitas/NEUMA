import { describe, expect, it } from 'bun:test';
import { SIDEBAR_TREE_MAX_INDENTED_DEPTH } from '@/modules/portal/constants/sidebar.constants';
import { buildSidebarTreeIndent, resolvePortalSpaceKind } from '@/modules/portal/lib/portal.sidebar.lib';

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
