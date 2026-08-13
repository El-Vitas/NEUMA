import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@company-brain/shared';
import {
  canCreateSpace,
  canManageWorkspace,
  canReadSpace,
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
});
