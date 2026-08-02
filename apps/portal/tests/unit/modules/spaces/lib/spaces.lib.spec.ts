import { describe, expect, it } from 'bun:test';
import { USER_ROLE, WORKSPACE_CAPABILITY_BY_ROLE } from '@company-brain/shared';
import { canEditContent, getSpaceVisibilityLabel } from '@/modules/spaces/lib/spaces.lib';

describe('spaces.lib', () => {
  it('allows admins and workers to edit content but not clients', () => {
    expect(canEditContent(USER_ROLE.ADMIN)).toBe(true);
    expect(canEditContent(USER_ROLE.WORKER)).toBe(true);
    expect(canEditContent(USER_ROLE.CLIENT)).toBe(false);
  });

  it('declares a capability entry for every persisted role', () => {
    expect(Object.keys(WORKSPACE_CAPABILITY_BY_ROLE)).toEqual(['ADMIN', 'WORKER', 'CLIENT']);
  });

  it('labels space visibility without exposing restricted metadata', () => {
    expect(getSpaceVisibilityLabel('PUBLIC_INTERNAL')).toBe('Visible para empleados');
    expect(getSpaceVisibilityLabel('RESTRICTED')).toBe('Restringido');
  });
});
