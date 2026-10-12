import { describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@neuma/shared';
import { findMcpProtectedDescendant } from '@/modules/mcp/lib/mcp.page-lifecycle.lib';
import type { McpPrincipal } from '@/modules/mcp/types/mcp.types';

const SPACE = '22222222-2222-4222-8222-222222222222';
const { pagesRead, pagesTrash, pagesWrite } = ACCESS_TOKEN_PERMISSIONS;

const principalWith = (pages: McpPrincipal['access']['pages']): McpPrincipal => ({
  access: { allSpaces: [pagesRead, pagesWrite, pagesTrash], pages, spaces: [] },
  role: USER_ROLE.WORKER,
  tokenId: 'token',
  userId: 'user',
  workspaceId: 'workspace',
});

const placeOf = (pageId: string, ...above: readonly string[]) => ({
  pageId,
  place: { lineage: [pageId, ...above], spaceId: SPACE },
});

describe('findMcpProtectedDescendant', () => {
  it('names a page under the target whose own rule does not let the token do it', () => {
    const principal = principalWith([{ pageId: 'child', permissions: [pagesRead] }]);

    expect(
      findMcpProtectedDescendant(principal, 'target', [placeOf('child', 'middle', 'target')], pagesTrash)?.pageId,
    ).toBe('child');
  });

  it('lets it through when the rules below allow it, or are about pages elsewhere', () => {
    const principal = principalWith([
      { pageId: 'child', permissions: [pagesRead, pagesTrash] },
      { pageId: 'elsewhere', permissions: [pagesRead] },
    ]);

    expect(
      findMcpProtectedDescendant(
        principal,
        'target',
        [placeOf('child', 'target'), placeOf('elsewhere', 'other')],
        pagesTrash,
      ),
    ).toBeNull();
  });

  it('does not count the target itself, which is checked on its own', () => {
    const principal = principalWith([{ pageId: 'target', permissions: [pagesRead] }]);

    expect(findMcpProtectedDescendant(principal, 'target', [placeOf('target', 'root')], pagesTrash)).toBeNull();
  });
});
