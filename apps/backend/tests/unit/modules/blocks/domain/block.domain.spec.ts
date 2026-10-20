import { describe, expect, it } from 'bun:test';
import { BLOCK_PRINCIPAL_KIND, BLOCK_ROLE, type BlockPermissionEntry, USER_ROLE } from '@neuma/shared';
import { buildVisibleBlocks, listRevokedBlockIds } from '@/modules/blocks/domain/block.domain';
import type { BlockRecord, BlockRows } from '@/modules/blocks/domain/block.domain.types';

const SPACE_ID = 'space-1';
const VIEWER_ID = 'user-viewer';
const OTHER_USER_ID = 'user-other';

const buildRecord = (overrides: Partial<BlockRecord> & Pick<BlockRecord, 'id'>): BlockRecord => ({
  alive: true,
  children: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdById: OTHER_USER_ID,
  editedAt: new Date('2026-01-01T00:00:00.000Z'),
  editedById: OTHER_USER_ID,
  format: null,
  lifecycle: 'ACTIVE',
  lockedAt: null,
  parentId: null,
  permissions: null,
  properties: {},
  spaceId: SPACE_ID,
  text: '',
  type: 'paragraph',
  version: 1,
  ...overrides,
});

const userEntry = (userId: string, role: BlockPermissionEntry['role']): BlockPermissionEntry => ({
  principal: { kind: BLOCK_PRINCIPAL_KIND.user, userId },
  role,
});

const spaceEntry = (role: BlockPermissionEntry['role']): BlockPermissionEntry => ({
  principal: { kind: BLOCK_PRINCIPAL_KIND.space },
  role,
});

const buildInput = (
  rows: BlockRows,
  workspaceRole: (typeof USER_ROLE)[keyof typeof USER_ROLE] = USER_ROLE.WORKER,
  readableSpaceIds: ReadonlySet<string> = new Set([SPACE_ID]),
) => ({ readableSpaceIds, rows, viewer: { userId: VIEWER_ID, workspaceRole } });

const findBlock = (blocks: ReturnType<typeof buildVisibleBlocks>, id: string) =>
  blocks.find((block) => block.id === id);

describe('buildVisibleBlocks', () => {
  it('gives every block of the subtree the role inherited from its nearest declaring ancestor', () => {
    const rows: BlockRows = {
      context: [buildRecord({ id: 'workspace-root', permissions: [spaceEntry(BLOCK_ROLE.reader)] })],
      targets: [
        buildRecord({ children: ['paragraph'], id: 'page', parentId: 'workspace-root', type: 'page' }),
        buildRecord({ id: 'paragraph', parentId: 'page' }),
      ],
    };

    const blocks = buildVisibleBlocks(buildInput(rows));

    expect(blocks.map((block) => block.role)).toEqual([BLOCK_ROLE.reader, BLOCK_ROLE.reader]);
  });

  it('lets a block override what it would inherit by declaring its own permissions', () => {
    const rows: BlockRows = {
      context: [],
      targets: [
        buildRecord({ children: ['promoted'], id: 'page', permissions: [spaceEntry(BLOCK_ROLE.reader)] }),
        buildRecord({ id: 'promoted', parentId: 'page', permissions: [userEntry(VIEWER_ID, BLOCK_ROLE.editor)] }),
      ],
    };

    const blocks = buildVisibleBlocks(buildInput(rows));

    expect(findBlock(blocks, 'page')?.role).toBe(BLOCK_ROLE.reader);
    expect(findBlock(blocks, 'promoted')?.role).toBe(BLOCK_ROLE.editor);
  });

  it('hides a private child with its descendants and removes its id from the parent children', () => {
    const rows: BlockRows = {
      context: [],
      targets: [
        buildRecord({ children: ['open', 'private'], id: 'page', type: 'page' }),
        buildRecord({ id: 'open', parentId: 'page' }),
        buildRecord({
          children: ['inside-private'],
          id: 'private',
          parentId: 'page',
          permissions: [userEntry(OTHER_USER_ID, BLOCK_ROLE.full)],
        }),
        buildRecord({ id: 'inside-private', parentId: 'private' }),
      ],
    };

    const blocks = buildVisibleBlocks(buildInput(rows));

    expect(blocks.map((block) => block.id)).toEqual(['page', 'open']);
    expect(findBlock(blocks, 'page')?.children).toEqual(['open']);
  });

  it('does not return a descendant of a hidden block even when it grants the viewer access itself', () => {
    const rows: BlockRows = {
      context: [],
      targets: [
        buildRecord({ children: ['private'], id: 'page' }),
        buildRecord({
          children: ['shared-inside'],
          id: 'private',
          parentId: 'page',
          permissions: [userEntry(OTHER_USER_ID, BLOCK_ROLE.full)],
        }),
        buildRecord({
          id: 'shared-inside',
          parentId: 'private',
          permissions: [userEntry(VIEWER_ID, BLOCK_ROLE.editor)],
        }),
      ],
    };

    const blocks = buildVisibleBlocks(buildInput(rows));

    expect(blocks.map((block) => block.id)).toEqual(['page']);
  });

  it('keeps a client read-only even where a space grant offers more', () => {
    const rows: BlockRows = {
      context: [],
      targets: [buildRecord({ id: 'page', permissions: [spaceEntry(BLOCK_ROLE.full)] })],
    };

    const blocks = buildVisibleBlocks(buildInput(rows, USER_ROLE.CLIENT));

    expect(blocks[0]?.role).toBe(BLOCK_ROLE.reader);
  });

  it('returns nothing when the viewer cannot read the space', () => {
    const rows: BlockRows = { context: [], targets: [buildRecord({ id: 'page' })] };

    const blocks = buildVisibleBlocks(buildInput(rows, USER_ROLE.ADMIN, new Set()));

    expect(blocks).toEqual([]);
  });

  it('sends the permissions only to a viewer with the full role', () => {
    const permissions = [userEntry(VIEWER_ID, BLOCK_ROLE.full), userEntry(OTHER_USER_ID, BLOCK_ROLE.reader)];
    const rows: BlockRows = {
      context: [],
      targets: [
        buildRecord({ children: ['declared-for-reader'], id: 'page', permissions }),
        buildRecord({
          id: 'declared-for-reader',
          parentId: 'page',
          permissions: [userEntry(VIEWER_ID, BLOCK_ROLE.reader)],
        }),
      ],
    };

    const blocks = buildVisibleBlocks(buildInput(rows));

    expect(findBlock(blocks, 'page')?.permissions).toEqual(permissions);
    expect(findBlock(blocks, 'declared-for-reader')).not.toHaveProperty('permissions');
  });

  it('removes from children the ids that are hidden among context rows or unknown', () => {
    const rows: BlockRows = {
      context: [
        buildRecord({
          id: 'hidden-sibling',
          parentId: 'page',
          permissions: [userEntry(OTHER_USER_ID, BLOCK_ROLE.full)],
        }),
        buildRecord({ id: 'visible-sibling', parentId: 'page' }),
      ],
      targets: [buildRecord({ children: ['hidden-sibling', 'visible-sibling', 'gone'], id: 'page' })],
    };

    const blocks = buildVisibleBlocks(buildInput(rows));

    expect(blocks[0]?.children).toEqual(['visible-sibling']);
  });

  it('returns dead blocks with alive false so a client can remove them', () => {
    const rows: BlockRows = { context: [], targets: [buildRecord({ alive: false, id: 'removed' })] };

    const blocks = buildVisibleBlocks(buildInput(rows));

    expect(blocks[0]).toMatchObject({ alive: false, id: 'removed' });
  });

  it('terminates when the parents form a cycle', () => {
    const rows: BlockRows = {
      context: [],
      targets: [buildRecord({ id: 'first', parentId: 'second' }), buildRecord({ id: 'second', parentId: 'first' })],
    };

    const blocks = buildVisibleBlocks(buildInput(rows));

    expect(blocks).toHaveLength(2);
  });

  it('inherits a declaration through a deep chain without a declaring block in between', () => {
    const rows: BlockRows = {
      context: [buildRecord({ id: 'top', permissions: [userEntry(VIEWER_ID, BLOCK_ROLE.reader)] })],
      targets: [buildRecord({ id: 'middle', parentId: 'top' }), buildRecord({ id: 'leaf', parentId: 'middle' })],
    };

    const blocks = buildVisibleBlocks(buildInput(rows));

    expect(blocks.map((block) => block.role)).toEqual([BLOCK_ROLE.reader, BLOCK_ROLE.reader]);
  });
});

describe('listRevokedBlockIds', () => {
  const revokedFor = (
    rows: BlockRows,
    requestedIds: readonly string[],
    readable: ReadonlySet<string> = new Set([SPACE_ID]),
  ) => {
    const input = buildInput(rows, USER_ROLE.WORKER, readable);
    return listRevokedBlockIds(input, requestedIds, buildVisibleBlocks(input));
  };

  it('reports a requested id that no longer exists', () => {
    expect(revokedFor({ context: [], targets: [] }, ['gone'])).toEqual(['gone']);
  });

  it('reports a requested block the viewer can no longer read', () => {
    const rows: BlockRows = {
      context: [],
      targets: [buildRecord({ id: 'closed', permissions: [userEntry(OTHER_USER_ID, BLOCK_ROLE.full)] })],
    };

    expect(revokedFor(rows, ['closed'])).toEqual(['closed']);
  });

  it('reports a requested block in a space the viewer cannot read, changed or not', () => {
    const rows: BlockRows = {
      context: [buildRecord({ id: 'unchanged' })],
      targets: [buildRecord({ id: 'changed' })],
    };

    expect(revokedFor(rows, ['changed', 'unchanged'], new Set())).toEqual(['changed', 'unchanged']);
  });

  it('does not report an unchanged block the viewer can still read, nor a returned one', () => {
    const rows: BlockRows = {
      context: [buildRecord({ id: 'unchanged' })],
      targets: [buildRecord({ id: 'changed' })],
    };

    expect(revokedFor(rows, ['changed', 'unchanged'])).toEqual([]);
  });

  it('reports a changed block cut off under a hidden parent', () => {
    const rows: BlockRows = {
      context: [],
      targets: [
        buildRecord({ id: 'closed', permissions: [userEntry(OTHER_USER_ID, BLOCK_ROLE.full)] }),
        buildRecord({ id: 'inside', parentId: 'closed' }),
      ],
    };

    expect(revokedFor(rows, ['closed', 'inside'])).toEqual(['closed', 'inside']);
  });
});
