import { describe, expect, it } from 'bun:test';
import { SIDEBAR_TREE_MAX_INDENTED_DEPTH } from '@/modules/portal/constants/sidebar.constants';
import { buildSidebarTreeIndent } from '@/modules/portal/lib/portal.sidebar.lib';

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
