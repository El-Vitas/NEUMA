import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@neuma/shared';
import { listReadableSpaceIdsByUser } from '@/modules/blocks/domain/block.space-access.domain';

const spaces = [
  { id: 'open', ownerId: null, visibility: 'PUBLIC_INTERNAL', workspaceId: 'w1' },
  { id: 'restricted', ownerId: null, visibility: 'RESTRICTED', workspaceId: 'w1' },
  { id: 'private', ownerId: 'owner', visibility: 'PRIVATE', workspaceId: 'w1' },
  { id: 'elsewhere', ownerId: null, visibility: 'PUBLIC_INTERNAL', workspaceId: 'w2' },
] as const;

const reader = (userId: string, role: keyof typeof USER_ROLE) => ({
  role: USER_ROLE[role],
  userId,
  workspaceId: 'w1',
});

describe('listReadableSpaceIdsByUser', () => {
  it('lets everyone read an open space, an admin a restricted one, and nobody but the owner and members a private one', () => {
    const readable = listReadableSpaceIdsByUser({
      memberships: [],
      readers: [reader('worker', 'WORKER'), reader('admin', 'ADMIN'), reader('owner', 'WORKER')],
      spaces,
    });

    expect([...(readable.get('worker') ?? [])]).toEqual(['open']);
    expect([...(readable.get('admin') ?? [])]).toEqual(['open', 'restricted']);
    expect([...(readable.get('owner') ?? [])]).toEqual(['open', 'private']);
  });

  it('opens a restricted and a private space to a member, whatever the role', () => {
    const readable = listReadableSpaceIdsByUser({
      memberships: [
        { spaceId: 'restricted', userId: 'worker' },
        { spaceId: 'private', userId: 'worker' },
      ],
      readers: [reader('worker', 'WORKER')],
      spaces,
    });

    expect([...(readable.get('worker') ?? [])].toSorted()).toEqual(['open', 'private', 'restricted']);
  });

  it('never reads a space of another workspace and answers an empty set for a reader who reads nothing', () => {
    const readable = listReadableSpaceIdsByUser({
      memberships: [],
      readers: [reader('worker', 'WORKER')],
      spaces: [spaces[3]],
    });

    expect(readable.get('worker')).toEqual(new Set());
  });
});
