import { describe, expect, test } from 'bun:test';
import { USER_ROLE } from '../types/user-role.types.js';
import { BLOCK_PERMISSION_ENTRY_LIMIT, BLOCK_PRINCIPAL_KIND, BLOCK_ROLE } from './block.constants.js';
import {
  canEditBlock,
  canManageBlockPermissions,
  canReadBlock,
  filterVisibleBlockIds,
  holdsFullBlockAccess,
  isBlockManageable,
  resolveBlockRole,
} from './block.permissions.lib.js';
import { blockPermissionEntrySchema, blockPermissionsSchema } from './block.schemas.js';
import type { BlockPermissionEntry, BlockPermissions, BlockRoleInput } from './block.types.js';

const VIEWER_ID = 'user-viewer';
const OTHER_USER_ID = 'user-other';

const userEntry = (userId: string, role: BlockPermissionEntry['role']): BlockPermissionEntry => ({
  principal: { kind: BLOCK_PRINCIPAL_KIND.user, userId },
  role,
});

const spaceEntry = (role: BlockPermissionEntry['role']): BlockPermissionEntry => ({
  principal: { kind: BLOCK_PRINCIPAL_KIND.space },
  role,
});

const buildInput = (
  workspaceRole: BlockRoleInput['viewer']['workspaceRole'],
  chainPermissions: BlockPermissions[],
  canReadSpace = true,
): BlockRoleInput => ({
  canReadSpace,
  chain: chainPermissions.map((permissions, index) => ({ id: `block-${String(index)}`, permissions })),
  viewer: { userId: VIEWER_ID, workspaceRole },
});

describe('resolveBlockRole', () => {
  test('is none when the viewer cannot read the space', () => {
    const input = buildInput(USER_ROLE.ADMIN, [null], false);

    expect(resolveBlockRole(input)).toBe(BLOCK_ROLE.none);
  });

  test('is the workspace ceiling when no block declares permissions', () => {
    expect(resolveBlockRole(buildInput(USER_ROLE.CLIENT, [null, null]))).toBe(BLOCK_ROLE.reader);
    expect(resolveBlockRole(buildInput(USER_ROLE.WORKER, [null, null]))).toBe(BLOCK_ROLE.editor);
    expect(resolveBlockRole(buildInput(USER_ROLE.ADMIN, [null, null]))).toBe(BLOCK_ROLE.full);
  });

  test('caps a client at reader even with an editor or full entry', () => {
    const asEditor = buildInput(USER_ROLE.CLIENT, [[userEntry(VIEWER_ID, BLOCK_ROLE.editor)]]);
    const asFull = buildInput(USER_ROLE.CLIENT, [[userEntry(VIEWER_ID, BLOCK_ROLE.full)]]);

    expect(resolveBlockRole(asEditor)).toBe(BLOCK_ROLE.reader);
    expect(resolveBlockRole(asFull)).toBe(BLOCK_ROLE.reader);
  });

  test('uses an explicit grant as written, so a worker can be full on their own page', () => {
    const input = buildInput(USER_ROLE.WORKER, [[userEntry(VIEWER_ID, BLOCK_ROLE.full)]]);

    expect(resolveBlockRole(input)).toBe(BLOCK_ROLE.full);
  });

  test('keeps a client at reader even when the explicit grant is full', () => {
    const input = buildInput(USER_ROLE.CLIENT, [[userEntry(VIEWER_ID, BLOCK_ROLE.full)]]);

    expect(resolveBlockRole(input)).toBe(BLOCK_ROLE.reader);
  });

  test('does not raise a role above what the entry grants', () => {
    const input = buildInput(USER_ROLE.ADMIN, [[userEntry(VIEWER_ID, BLOCK_ROLE.reader)]]);

    expect(resolveBlockRole(input)).toBe(BLOCK_ROLE.reader);
  });

  test('inherits from a grandparent when the block and its parent declare nothing', () => {
    const input = buildInput(USER_ROLE.ADMIN, [null, null, [userEntry(VIEWER_ID, BLOCK_ROLE.editor)]]);

    expect(resolveBlockRole(input)).toBe(BLOCK_ROLE.editor);
  });

  test('lets the nearest declaring ancestor win over a farther one', () => {
    const input = buildInput(USER_ROLE.ADMIN, [
      null,
      [userEntry(VIEWER_ID, BLOCK_ROLE.reader)],
      [userEntry(VIEWER_ID, BLOCK_ROLE.full)],
    ]);

    expect(resolveBlockRole(input)).toBe(BLOCK_ROLE.reader);
  });

  test('is none for an admin who is not listed on a block that declares permissions', () => {
    const input = buildInput(USER_ROLE.ADMIN, [[userEntry(OTHER_USER_ID, BLOCK_ROLE.full)], null]);

    expect(resolveBlockRole(input)).toBe(BLOCK_ROLE.none);
  });

  test('is none when the declared list is empty', () => {
    expect(resolveBlockRole(buildInput(USER_ROLE.ADMIN, [[]]))).toBe(BLOCK_ROLE.none);
  });

  test('falls back to the space entry when the viewer is not listed', () => {
    const input = buildInput(USER_ROLE.WORKER, [
      [userEntry(OTHER_USER_ID, BLOCK_ROLE.full), spaceEntry(BLOCK_ROLE.reader)],
    ]);

    expect(resolveBlockRole(input)).toBe(BLOCK_ROLE.reader);
  });

  test('prefers the user entry over the space entry', () => {
    const input = buildInput(USER_ROLE.WORKER, [
      [spaceEntry(BLOCK_ROLE.reader), userEntry(VIEWER_ID, BLOCK_ROLE.editor)],
    ]);

    expect(resolveBlockRole(input)).toBe(BLOCK_ROLE.editor);
  });

  test('is the ceiling for an empty chain', () => {
    expect(resolveBlockRole(buildInput(USER_ROLE.ADMIN, []))).toBe(BLOCK_ROLE.full);
  });
});

describe('block role predicates', () => {
  test('canReadBlock needs at least reader', () => {
    expect(canReadBlock(BLOCK_ROLE.none)).toBe(false);
    expect(canReadBlock(BLOCK_ROLE.reader)).toBe(true);
  });

  test('canEditBlock needs at least editor', () => {
    expect(canEditBlock(BLOCK_ROLE.reader)).toBe(false);
    expect(canEditBlock(BLOCK_ROLE.editor)).toBe(true);
    expect(canEditBlock(BLOCK_ROLE.full)).toBe(true);
  });

  test('canManageBlockPermissions needs full', () => {
    expect(canManageBlockPermissions(BLOCK_ROLE.editor)).toBe(false);
    expect(canManageBlockPermissions(BLOCK_ROLE.full)).toBe(true);
  });
});

describe('filterVisibleBlockIds', () => {
  test('drops the ids the viewer cannot read and keeps the order', () => {
    const children = [
      { id: 'a', role: BLOCK_ROLE.reader },
      { id: 'hidden', role: BLOCK_ROLE.none },
      { id: 'b', role: BLOCK_ROLE.full },
    ];

    expect(filterVisibleBlockIds(children)).toEqual(['a', 'b']);
  });

  test('returns nothing when every child is hidden', () => {
    expect(filterVisibleBlockIds([{ id: 'hidden', role: BLOCK_ROLE.none }])).toEqual([]);
  });
});

describe('block permission schemas', () => {
  test('accepts user and space entries', () => {
    expect(blockPermissionEntrySchema.safeParse(userEntry(VIEWER_ID, BLOCK_ROLE.editor)).success).toBe(true);
    expect(blockPermissionEntrySchema.safeParse(spaceEntry(BLOCK_ROLE.reader)).success).toBe(true);
  });

  test('rejects an unknown role and a user entry without an id', () => {
    expect(blockPermissionEntrySchema.safeParse({ principal: { kind: 'space' }, role: 'owner' }).success).toBe(false);
    expect(blockPermissionEntrySchema.safeParse({ principal: { kind: 'user' }, role: 'reader' }).success).toBe(false);
  });

  test('accepts null and a list within the limit', () => {
    expect(blockPermissionsSchema.safeParse(null).success).toBe(true);
    expect(blockPermissionsSchema.safeParse([spaceEntry(BLOCK_ROLE.reader)]).success).toBe(true);
  });

  test('rejects unknown keys on entries and principals', () => {
    const extraEntryKey = { ...spaceEntry(BLOCK_ROLE.reader), extra: true };
    const extraPrincipalKey = { principal: { kind: 'space', extra: true }, role: BLOCK_ROLE.reader };

    expect(blockPermissionEntrySchema.safeParse(extraEntryKey).success).toBe(false);
    expect(blockPermissionEntrySchema.safeParse(extraPrincipalKey).success).toBe(false);
  });

  test('rejects a duplicate user or a duplicate space entry', () => {
    const duplicateUser = [userEntry(VIEWER_ID, BLOCK_ROLE.reader), userEntry(VIEWER_ID, BLOCK_ROLE.editor)];
    const duplicateSpace = [spaceEntry(BLOCK_ROLE.reader), spaceEntry(BLOCK_ROLE.editor)];
    const distinct = [userEntry(VIEWER_ID, BLOCK_ROLE.reader), userEntry(OTHER_USER_ID, BLOCK_ROLE.reader)];

    expect(blockPermissionsSchema.safeParse(duplicateUser).success).toBe(false);
    expect(blockPermissionsSchema.safeParse(duplicateSpace).success).toBe(false);
    expect(blockPermissionsSchema.safeParse(distinct).success).toBe(true);
  });

  test('rejects a list over the limit', () => {
    const tooMany = Array.from({ length: BLOCK_PERMISSION_ENTRY_LIMIT + 1 }, (_, index) =>
      userEntry(`user-${String(index)}`, BLOCK_ROLE.reader),
    );

    expect(blockPermissionsSchema.safeParse(tooMany).success).toBe(false);
  });
});

describe('who can still manage a block', () => {
  const holder = (id: string, workspaceRole: BlockRoleInput['viewer']['workspaceRole'], canReadSpace = true) => ({
    canReadSpace,
    id,
    workspaceRole,
  });
  const admin = holder('admin', USER_ROLE.ADMIN);
  const worker = holder('worker', USER_ROLE.WORKER);
  const client = holder('client', USER_ROLE.CLIENT);
  const outsider = holder('outsider', USER_ROLE.WORKER, false);

  test('lets an admin hold full when nothing is declared, and nobody else', () => {
    expect(holdsFullBlockAccess(admin, null)).toBe(true);
    expect(holdsFullBlockAccess(worker, null)).toBe(false);
  });

  test('gives full to a listed worker, but never to a client or to someone who cannot open the space', () => {
    const listed = [
      userEntry('worker', BLOCK_ROLE.full),
      userEntry('client', BLOCK_ROLE.full),
      userEntry('outsider', BLOCK_ROLE.full),
    ];

    expect(holdsFullBlockAccess(worker, listed)).toBe(true);
    expect(holdsFullBlockAccess(client, listed)).toBe(false);
    expect(holdsFullBlockAccess(outsider, listed)).toBe(false);
  });

  test('is manageable while someone still holds full, and not once nobody does', () => {
    const members = [admin, worker, client, outsider];

    expect(isBlockManageable(members, [userEntry('worker', BLOCK_ROLE.full)])).toBe(true);
    expect(
      isBlockManageable(members, [userEntry('worker', BLOCK_ROLE.editor), userEntry('client', BLOCK_ROLE.full)]),
    ).toBe(false);
    expect(isBlockManageable(members, [])).toBe(false);
    expect(isBlockManageable(members, null)).toBe(true);
  });
});
