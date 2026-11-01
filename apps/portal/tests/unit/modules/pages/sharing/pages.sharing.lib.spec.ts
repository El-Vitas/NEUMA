import { describe, expect, it } from 'bun:test';
import { BLOCK_ROLE } from '@neuma/shared';
import {
  addMemberEntry,
  assessPermissionsChange,
  listAssignableRoles,
  listMembersToAdd,
  listRestrictedBlockIds,
  readInheritedPermissions,
  readStartingEntries,
  removeEntry,
  setEntryRole,
  toPermissionEntries,
  updateRestrictedBlockIds,
} from '@/modules/pages/sharing/lib/pages.sharing.lib';
import type { BlockAccess, SharingEntry, SharingMember } from '@/modules/pages/sharing/types/pages.sharing.types';

const adminMember: SharingMember = {
  canReadSpace: true,
  email: 'admin@example.com',
  id: 'admin',
  name: 'Admin',
  workspaceRole: 'ADMIN',
};
const workerMember: SharingMember = {
  canReadSpace: true,
  email: 'worker@example.com',
  id: 'worker',
  name: 'Worker',
  workspaceRole: 'WORKER',
};
const clientMember: SharingMember = {
  canReadSpace: true,
  email: 'client@example.com',
  id: 'client',
  name: 'Client',
  workspaceRole: 'CLIENT',
};
const outsiderMember: SharingMember = {
  ...workerMember,
  canReadSpace: false,
  email: 'out@example.com',
  id: 'outsider',
};
const members = [adminMember, workerMember, clientMember, outsiderMember];

const userEntry = (member: SharingMember, role: SharingEntry['role']): SharingEntry => ({
  principal: { kind: 'user', userId: member.id },
  role,
  user: { email: member.email, id: member.id, name: member.name },
});
const spaceEntry = (role: SharingEntry['role']): SharingEntry => ({ principal: { kind: 'space' }, role, user: null });

const buildAccess = (overrides: Partial<BlockAccess> = {}): BlockAccess => ({
  blockId: 'block',
  entries: [],
  inherited: { entries: [], source: null },
  isDeclaredHere: false,
  members,
  source: null,
  spaceId: 'space',
  viewerId: 'admin',
  ...overrides,
});

describe('the blocks of a page that have their own access', () => {
  const block = (id: string, hasOwnPermissions: boolean, alive = true) => ({ alive, hasOwnPermissions, id });

  it('lists the live ones, leaving out the page itself, whose lock is drawn elsewhere', () => {
    const ids = listRestrictedBlockIds(
      [block('page', true), block('section', true), block('plain', false), block('gone', true, false)],
      'page',
    );

    expect([...ids]).toEqual(['section']);
  });

  it('lists none when the blocks could not be read', () => {
    expect(listRestrictedBlockIds(null, 'page').size).toBe(0);
    expect(listRestrictedBlockIds(undefined, 'page').size).toBe(0);
  });

  it('adds a block once it declares its own access, and drops it once it follows its parent again', () => {
    const added = updateRestrictedBlockIds(new Set(['a']), { blockId: 'b', hasOwnPermissions: true });
    const dropped = updateRestrictedBlockIds(added, { blockId: 'a', hasOwnPermissions: false });

    expect([...added]).toEqual(['a', 'b']);
    expect([...dropped]).toEqual(['b']);
  });
});

describe('toPermissionEntries', () => {
  it('keeps the principal and the role, and drops the person', () => {
    expect(toPermissionEntries([userEntry(adminMember, BLOCK_ROLE.full), spaceEntry(BLOCK_ROLE.reader)])).toEqual([
      { principal: { kind: 'user', userId: 'admin' }, role: 'full' },
      { principal: { kind: 'space' }, role: 'reader' },
    ]);
  });
});

describe('editing the entries', () => {
  it('changes the role of one principal and leaves the others', () => {
    const next = setEntryRole(
      [userEntry(adminMember, BLOCK_ROLE.full), userEntry(workerMember, BLOCK_ROLE.reader)],
      { kind: 'user', userId: 'worker' },
      BLOCK_ROLE.editor,
    );

    expect(next.map((entry) => entry.role)).toEqual(['full', 'editor']);
  });

  it('removes one principal', () => {
    const next = removeEntry([userEntry(adminMember, BLOCK_ROLE.full), spaceEntry(BLOCK_ROLE.reader)], {
      kind: 'space',
    });

    expect(next).toEqual([userEntry(adminMember, BLOCK_ROLE.full)]);
  });

  it('adds a member once, with the person attached', () => {
    const next = addMemberEntry([userEntry(adminMember, BLOCK_ROLE.full)], workerMember, BLOCK_ROLE.editor);
    const again = addMemberEntry(next, workerMember, BLOCK_ROLE.reader);

    expect(next[1]).toEqual(userEntry(workerMember, BLOCK_ROLE.editor));
    expect(again).toEqual(next);
  });

  it('never gives a client more than reading', () => {
    const next = addMemberEntry([], clientMember, BLOCK_ROLE.full);

    expect(next[0]?.role).toBe(BLOCK_ROLE.reader);
    expect(listAssignableRoles(clientMember)).toEqual([BLOCK_ROLE.reader]);
    expect(listAssignableRoles(workerMember)).toEqual([BLOCK_ROLE.reader, BLOCK_ROLE.editor, BLOCK_ROLE.full]);
  });
});

describe('listMembersToAdd', () => {
  it('leaves out the people already listed and those who cannot open the space', () => {
    const ids = listMembersToAdd(members, [userEntry(adminMember, BLOCK_ROLE.full)]).map((member) => member.id);

    expect(ids).toEqual(['worker', 'client']);
  });
});

describe('readStartingEntries', () => {
  it('copies what the block inherits so it can be changed here', () => {
    const inherited = [userEntry(adminMember, BLOCK_ROLE.full), spaceEntry(BLOCK_ROLE.reader)];
    const access = buildAccess({
      entries: inherited,
      inherited: { entries: inherited, source: { id: 'page', title: 'Parent', type: 'page' } },
      source: { id: 'page', title: 'Parent', type: 'page' },
    });

    expect(readStartingEntries(access)).toEqual(inherited);
  });

  it('starts from the space default when nothing above declares: admins keep full, the rest of the space edits', () => {
    const entries = readStartingEntries(buildAccess());

    expect(toPermissionEntries(entries)).toEqual([
      { principal: { kind: 'user', userId: 'admin' }, role: 'full' },
      { principal: { kind: 'space' }, role: 'editor' },
    ]);
  });
});

describe('readInheritedPermissions', () => {
  it('is null when nothing above declares, so the space decides', () => {
    expect(readInheritedPermissions(buildAccess())).toBeNull();
  });

  it('is what the nearest declaration above says', () => {
    const above = [userEntry(adminMember, BLOCK_ROLE.full)];
    const access = buildAccess({ inherited: { entries: above, source: { id: 'page', title: 'P', type: 'page' } } });

    expect(readInheritedPermissions(access)).toEqual(toPermissionEntries(above));
  });
});

describe('assessPermissionsChange', () => {
  const assess = (permissions: ReturnType<typeof toPermissionEntries> | null, viewerId = 'admin') =>
    assessPermissionsChange({ members, permissions, viewerId });

  it('is safe while the viewer keeps full access', () => {
    expect(assess(toPermissionEntries([userEntry(adminMember, BLOCK_ROLE.full)]))).toBe('safe');
  });

  it('is safe when nothing is declared and the viewer is an admin', () => {
    expect(assess(null)).toBe('safe');
  });

  it('warns that the viewer keeps reading but cannot manage when another person keeps full access', () => {
    const verdict = assess(
      toPermissionEntries([userEntry(adminMember, BLOCK_ROLE.editor), userEntry(workerMember, BLOCK_ROLE.full)]),
    );

    expect(verdict).toBe('losesManagement');
  });

  it('warns that the viewer loses access when they are left out and another person keeps full access', () => {
    expect(assess(toPermissionEntries([userEntry(workerMember, BLOCK_ROLE.full)]))).toBe('losesAccess');
  });

  it('stops a change after which nobody would hold full access', () => {
    expect(assess(toPermissionEntries([userEntry(workerMember, BLOCK_ROLE.editor)]))).toBe('lockout');
    expect(assess(toPermissionEntries([userEntry(adminMember, BLOCK_ROLE.editor)]))).toBe('lockout');
    expect(assess([])).toBe('lockout');
  });

  it('does not count a client, or a person who cannot open the space, as someone who could give access back', () => {
    const verdict = assess(
      toPermissionEntries([
        userEntry(adminMember, BLOCK_ROLE.reader),
        userEntry(clientMember, BLOCK_ROLE.full),
        userEntry(outsiderMember, BLOCK_ROLE.full),
      ]),
    );

    expect(verdict).toBe('lockout');
  });

  it('counts the other admins when the block goes back to following the space', () => {
    expect(assess(null, 'worker')).toBe('losesManagement');
  });
});
