import { describe, expect, it } from 'bun:test';
import { BLOCK_ROLE, USER_ROLE } from '@neuma/shared';
import { listReadableBlockIds, readBlockTitle } from '@/common/domain/block-access.domain';
import type { BlockAccessChainRow, BlockAccessViewer } from '@/common/types/block-access.types';

const viewer: BlockAccessViewer = { role: USER_ROLE.CLIENT, userId: 'viewer', workspaceId: 'workspace' };

const row = (overrides: Partial<BlockAccessChainRow> & { candidateId: string; id: string }): BlockAccessChainRow => ({
  alive: true,
  lifecycle: 'ACTIVE',
  permissions: null,
  spaceId: 'space',
  ...overrides,
});

const readable = (rows: readonly BlockAccessChainRow[], spaceIds: readonly string[] = ['space']) =>
  listReadableBlockIds({ readableSpaceIds: new Set(spaceIds), rows, viewer });

describe('listReadableBlockIds', () => {
  it('reads a block in a visible space that declares no permissions', () => {
    expect(readable([row({ candidateId: 'a', id: 'a' })]).has('a')).toBe(true);
  });

  it('hides a block whose space the viewer cannot see', () => {
    expect(readable([row({ candidateId: 'a', id: 'a' })], []).has('a')).toBe(false);
  });

  it('hides a block when the nearest declaring ancestor leaves the viewer out', () => {
    const adminOnly = [{ principal: { kind: 'user' as const, userId: 'someone-else' }, role: BLOCK_ROLE.full }];
    const rows = [
      row({ candidateId: 'child', id: 'child' }),
      row({ candidateId: 'child', id: 'page', permissions: adminOnly }),
    ];

    expect(readable(rows).has('child')).toBe(false);
  });

  it('lets a nearer declaration reopen what a farther one closed', () => {
    const closed = [{ principal: { kind: 'user' as const, userId: 'someone-else' }, role: BLOCK_ROLE.full }];
    const open = [{ principal: { kind: 'user' as const, userId: 'viewer' }, role: BLOCK_ROLE.reader }];
    const rows = [
      row({ candidateId: 'child', id: 'child', permissions: open }),
      row({ candidateId: 'child', id: 'page', permissions: closed }),
    ];

    expect(readable(rows).has('child')).toBe(true);
  });

  it('hides a block under a trashed or removed ancestor', () => {
    const underTrash = [row({ candidateId: 'a', id: 'a' }), row({ candidateId: 'a', id: 'p', lifecycle: 'TRASHED' })];
    const underRemoved = [row({ candidateId: 'b', id: 'b' }), row({ candidateId: 'b', id: 'q', alive: false })];

    expect(readable([...underTrash, ...underRemoved]).size).toBe(0);
  });
});

describe('readBlockTitle', () => {
  it('joins the plain text segments of the title', () => {
    expect(readBlockTitle({ title: [{ insert: 'Hello ' }, { insert: 'world' }] })).toBe('Hello world');
  });

  it('reads a missing or malformed title as empty', () => {
    expect(readBlockTitle({})).toBe('');
    expect(readBlockTitle({ title: 'nope' })).toBe('');
    expect(readBlockTitle(null)).toBe('');
  });
});
