import { describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@company-brain/db';
import { USER_ROLE } from '@company-brain/shared';
import { SpacesService } from '@/modules/spaces/spaces.service';
import type { SpaceRepositoryContract, SpaceSummary } from '@/modules/spaces/types/space.types';

const space: SpaceSummary = {
  icon: null,
  id: 'space-a',
  name: 'Engineering',
  order: 0,
  slug: 'engineering',
  visibility: SpaceVisibility.RESTRICTED,
};

const member = { email: 'editor@test.com', id: 'user-a', name: 'Editor One' };

const createRepository = (overrides: Partial<SpaceRepositoryContract> = {}): SpaceRepositoryContract => ({
  countMembersLosingAccess: () => Promise.resolve(0),
  create: () => Promise.resolve(space),
  listAccessible: () => Promise.resolve([space]),
  listAssignableMembers: () => Promise.resolve([member]),
  rename: () => Promise.resolve(space),
  reorder: () => Promise.resolve([space]),
  updateIcon: () => Promise.resolve(space),
  ...overrides,
});

describe('spaces service — listAssignableMembers', () => {
  it('returns the assignable members for a space the caller can read', async () => {
    const service = new SpacesService(createRepository());

    const result = await service.listAssignableMembers('space-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual([member]);
  });

  it('returns nothing when the caller cannot read the space', async () => {
    const repository = createRepository({ listAssignableMembers: () => Promise.resolve(null) });
    const service = new SpacesService(repository);

    const result = await service.listAssignableMembers('space-a', 'workspace-a', 'user-a', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SPACE_ACCESS_DENIED');
  });

  it('does not impose an admin-only restriction for a non-admin editor', async () => {
    let receivedRole: string | undefined;
    const repository = createRepository({
      listAssignableMembers: (_spaceId, _workspaceId, _userId, role) => {
        receivedRole = role;
        return Promise.resolve([member]);
      },
    });
    const service = new SpacesService(repository);

    const result = await service.listAssignableMembers('space-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(receivedRole).toBe(USER_ROLE.WORKER);
  });

  it('returns only the fields a picker needs, per member', async () => {
    const service = new SpacesService(createRepository());

    const result = await service.listAssignableMembers('space-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(Object.keys(result.getValue()[0] ?? {}).sort()).toEqual(['email', 'id', 'name']);
  });
});

describe('spaces service — rename', () => {
  it('renames the space for somebody who could have created one', async () => {
    const repository = createRepository({
      rename: (_spaceId, name) => Promise.resolve({ ...space, name }),
    });
    const service = new SpacesService(repository);

    const result = await service.rename('space-a', 'Platform', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue().name).toBe('Platform');
  });

  it('refuses a reader, who has nothing to say about what a space is called', async () => {
    const service = new SpacesService(createRepository());

    const result = await service.rename('space-a', 'Platform', 'workspace-a', 'user-a', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SPACE_ACCESS_DENIED');
  });

  it('refuses a space the caller cannot reach', async () => {
    const repository = createRepository({ rename: () => Promise.resolve(null) });
    const service = new SpacesService(repository);

    const result = await service.rename('space-a', 'Platform', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SPACE_ACCESS_DENIED');
  });
});

describe('spaces service — updateIcon', () => {
  const marked: SpaceSummary = { ...space, icon: { color: 'blue', kind: 'symbol', name: 'rocket' } };

  it('marks the space for somebody who could have created one', async () => {
    const repository = createRepository({ updateIcon: () => Promise.resolve(marked) });
    const service = new SpacesService(repository);

    const result = await service.updateIcon(
      'space-a',
      { color: 'blue', kind: 'symbol', name: 'rocket' },
      'workspace-a',
      'user-a',
      USER_ROLE.WORKER,
    );

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual(marked);
  });

  it('refuses a reader, who has nothing to say about how a space is drawn', async () => {
    const service = new SpacesService(createRepository());

    const result = await service.updateIcon(
      'space-a',
      { kind: 'emoji', value: '🚀' },
      'workspace-a',
      'user-a',
      USER_ROLE.CLIENT,
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SPACE_ACCESS_DENIED');
  });

  it('refuses a mark that is not one', async () => {
    const service = new SpacesService(createRepository());

    const result = await service.updateIcon('space-a', { kind: 'sticker' }, 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SPACE_ICON_INVALID');
  });

  it('clears the mark when asked for none', async () => {
    const repository = createRepository({ updateIcon: (_spaceId, icon) => Promise.resolve({ ...space, icon }) });
    const service = new SpacesService(repository);

    const result = await service.updateIcon('space-a', null, 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue().icon).toBeNull();
  });

  it('refuses a space the caller cannot reach', async () => {
    const repository = createRepository({ updateIcon: () => Promise.resolve(null) });
    const service = new SpacesService(repository);

    const result = await service.updateIcon(
      'space-a',
      { kind: 'emoji', value: '🚀' },
      'workspace-a',
      'user-a',
      USER_ROLE.WORKER,
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SPACE_ACCESS_DENIED');
  });
});

describe('spaces service — countMoveAccessLoss', () => {
  it('reports how many people the repository says would lose access', async () => {
    const repository = createRepository({ countMembersLosingAccess: () => Promise.resolve(3) });
    const service = new SpacesService(repository);

    const result = await service.countMoveAccessLoss('space-a', 'space-b', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toBe(3);
  });

  it('passes both space ids through to the repository, in order', async () => {
    let receivedArgs: readonly [string, string] | undefined;
    const repository = createRepository({
      countMembersLosingAccess: (sourceSpaceId, targetSpaceId) => {
        receivedArgs = [sourceSpaceId, targetSpaceId];
        return Promise.resolve(0);
      },
    });
    const service = new SpacesService(repository);

    await service.countMoveAccessLoss('space-a', 'space-b', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(receivedArgs).toEqual(['space-a', 'space-b']);
  });

  it('refuses a space the caller cannot reach', async () => {
    const repository = createRepository({ countMembersLosingAccess: () => Promise.resolve(null) });
    const service = new SpacesService(repository);

    const result = await service.countMoveAccessLoss('space-a', 'space-b', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SPACE_ACCESS_DENIED');
  });
});
