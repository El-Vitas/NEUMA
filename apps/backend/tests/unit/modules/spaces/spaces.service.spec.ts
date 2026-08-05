import { describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@company-brain/db';
import { USER_ROLE } from '@company-brain/shared';
import { SpacesService } from '@/modules/spaces/spaces.service';
import type { SpaceRepositoryContract, SpaceSummary } from '@/modules/spaces/types/space.types';

const space: SpaceSummary = {
  id: 'space-a',
  name: 'Engineering',
  slug: 'engineering',
  visibility: SpaceVisibility.RESTRICTED,
};

const member = { email: 'editor@test.com', id: 'user-a', name: 'Editor One' };

const createRepository = (overrides: Partial<SpaceRepositoryContract> = {}): SpaceRepositoryContract => ({
  create: () => Promise.resolve(space),
  listAccessible: () => Promise.resolve([space]),
  listAssignableMembers: () => Promise.resolve([member]),
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
