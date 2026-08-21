import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@company-brain/shared';
import {
  canCreateSpace,
  canManageWorkspace,
  canReadSpace,
  canRenameSpace,
  canShareSpace,
  getWorkspaceCapability,
} from '@/common/domain/workspace.domain';

describe('workspace domain policy', () => {
  it('allows an admin to manage the workspace', () => {
    expect(canManageWorkspace(USER_ROLE.ADMIN)).toBe(true);
    expect(getWorkspaceCapability(USER_ROLE.ADMIN)).toBe('admin');
  });

  it('allows workers to create spaces but not manage the workspace', () => {
    expect(canCreateSpace(USER_ROLE.WORKER)).toBe(true);
    expect(canManageWorkspace(USER_ROLE.WORKER)).toBe(false);
    expect(getWorkspaceCapability(USER_ROLE.WORKER)).toBe('editor');
    expect(getWorkspaceCapability(USER_ROLE.CLIENT)).toBe('viewer');
  });

  it('requires restricted-space membership for non-admin employees', () => {
    expect(canReadSpace(USER_ROLE.WORKER, 'RESTRICTED', false)).toBe(false);
    expect(canReadSpace(USER_ROLE.WORKER, 'RESTRICTED', true)).toBe(true);
    expect(canReadSpace(USER_ROLE.WORKER, 'PUBLIC_INTERNAL', false)).toBe(true);
  });

  it('lets an admin read a restricted space without membership, unlike a private one', () => {
    expect(canReadSpace(USER_ROLE.ADMIN, 'RESTRICTED', false)).toBe(true);
    expect(canReadSpace(USER_ROLE.ADMIN, 'PRIVATE', false)).toBe(false);
  });

  it('never lets an admin read a private space that is not their own', () => {
    expect(canReadSpace(USER_ROLE.ADMIN, 'PRIVATE', false, false)).toBe(false);
    expect(canReadSpace(USER_ROLE.ADMIN, 'PRIVATE', false, true)).toBe(true);
    expect(canReadSpace(USER_ROLE.ADMIN, 'PRIVATE', true, false)).toBe(true);
  });

  it('lets any role read its own private space, and nothing else private', () => {
    expect(canReadSpace(USER_ROLE.CLIENT, 'PRIVATE', false, true)).toBe(true);
    expect(canReadSpace(USER_ROLE.CLIENT, 'PRIVATE', false, false)).toBe(false);
  });

  it('only lets the owner of a private space share it', () => {
    expect(canShareSpace('PRIVATE', 'user-a', 'user-a')).toBe(true);
    expect(canShareSpace('PRIVATE', 'user-a', 'user-b')).toBe(false);
    expect(canShareSpace('RESTRICTED', 'user-a', 'user-a')).toBe(false);
  });
});

describe('canRenameSpace', () => {
  it('lets whoever owns a private space name it, whatever they may do elsewhere', () => {
    expect(canRenameSpace('CLIENT', 'PRIVATE', 'user-a', 'user-a')).toBe(true);
  });

  it('keeps a private space out of the hands of everyone else, admin included', () => {
    expect(canRenameSpace('ADMIN', 'PRIVATE', 'user-a', 'user-b')).toBe(false);
  });

  it('leaves the shared spaces to whoever may make them', () => {
    expect(canRenameSpace('CLIENT', 'PUBLIC_INTERNAL', null, 'user-a')).toBe(false);
    expect(canRenameSpace('WORKER', 'PUBLIC_INTERNAL', null, 'user-a')).toBe(true);
  });
});
