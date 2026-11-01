import { describe, expect, it } from 'bun:test';
import { PageLifecycle } from '@neuma/db';
import { BLOCK_ROLE, USER_ROLE } from '@neuma/shared';
import { canReadPage, describePageAccess } from '@/modules/pages/domain/page.access.domain';
import { isPageInTokenScope } from '@/modules/pages/domain/page.token-scope.domain';

const viewer = { userId: 'user-1', workspaceRole: USER_ROLE.WORKER };

const link = (id: string, lifecycle: PageLifecycle = PageLifecycle.ACTIVE, permissions = null) => ({
  id,
  lifecycle,
  permissions,
});

describe('who may read a page', () => {
  it('reads a page nobody restricted, in a space the viewer can read', () => {
    const profile = describePageAccess([link('page'), link('parent')], viewer, true);

    expect(profile.isInTrash).toBe(false);
    expect(canReadPage(profile)).toBe(true);
  });

  it('reads nothing in a space the viewer cannot read', () => {
    const profile = describePageAccess([link('page')], viewer, false);

    expect(profile.role).toBe(BLOCK_ROLE.none);
    expect(canReadPage(profile)).toBe(false);
  });

  it('puts a page in the trash when it or any page above it is trashed', () => {
    expect(describePageAccess([link('page'), link('parent', PageLifecycle.TRASHED)], viewer, true).isInTrash).toBe(
      true,
    );
    expect(describePageAccess([link('page', PageLifecycle.TRASHED)], viewer, true).isInTrash).toBe(true);
  });

  it('lets the nearest page that declares permissions decide', () => {
    const closed = [{ principal: { kind: 'user' as const, userId: 'someone-else' }, role: BLOCK_ROLE.full }];

    const profile = describePageAccess(
      [link('page'), link('parent', PageLifecycle.ACTIVE, closed as never)],
      viewer,
      true,
    );

    expect(canReadPage(profile)).toBe(false);
  });
});

describe('what a token may reach', () => {
  const scope = {
    allowedPageIds: ['allowed'],
    closedPageIds: ['closed'],
    closedSpaceIds: ['closed-space'],
    openSpaceIds: ['open-space'],
    readsEverywhere: false,
  };

  it('reaches everything when there is no scope', () => {
    expect(isPageInTokenScope({ id: 'any', spaceId: 'any' }, undefined)).toBe(true);
  });

  it('lets the page rule beat the rule of its space', () => {
    expect(isPageInTokenScope({ id: 'allowed', spaceId: 'closed-space' }, scope)).toBe(true);
    expect(isPageInTokenScope({ id: 'closed', spaceId: 'open-space' }, scope)).toBe(false);
  });

  it('follows the open spaces, or every space but the closed ones when it reads everywhere', () => {
    expect(isPageInTokenScope({ id: 'page', spaceId: 'open-space' }, scope)).toBe(true);
    expect(isPageInTokenScope({ id: 'page', spaceId: 'other-space' }, scope)).toBe(false);
    expect(isPageInTokenScope({ id: 'page', spaceId: 'other-space' }, { ...scope, readsEverywhere: true })).toBe(true);
    expect(isPageInTokenScope({ id: 'page', spaceId: 'closed-space' }, { ...scope, readsEverywhere: true })).toBe(
      false,
    );
  });
});
