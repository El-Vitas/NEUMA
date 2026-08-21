import { describe, expect, it } from 'bun:test';
import { USER_ROLE, WORKSPACE_CAPABILITY_BY_ROLE } from '@company-brain/shared';
import {
  canEditContent,
  canManageWorkspace,
  getSpaceFieldErrorCode,
  getSpaceVisibilityLabel,
  resolveSpaceFieldErrorMessage,
} from '@/modules/spaces/lib/spaces.lib';
import { createSpaceSchema } from '@/modules/spaces/schemas/spaces.schemas';

describe('spaces.lib', () => {
  it('leaves managing the workspace to admins alone', () => {
    expect(canManageWorkspace(USER_ROLE.ADMIN)).toBe(true);
    expect(canManageWorkspace(USER_ROLE.WORKER)).toBe(false);
    expect(canManageWorkspace(USER_ROLE.CLIENT)).toBe(false);
  });

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

  it('flags an empty or overlong space name and accepts a valid one', () => {
    expect(getSpaceFieldErrorCode(createSpaceSchema.shape.name, '')).toBe('tooShort');
    expect(getSpaceFieldErrorCode(createSpaceSchema.shape.name, 'a'.repeat(121))).toBe('tooLong');
    expect(getSpaceFieldErrorCode(createSpaceSchema.shape.name, 'Engineering')).toBeUndefined();
  });

  it('flags an empty or overlong space slug and accepts a valid one', () => {
    expect(getSpaceFieldErrorCode(createSpaceSchema.shape.slug, '')).toBe('tooShort');
    expect(getSpaceFieldErrorCode(createSpaceSchema.shape.slug, 'a'.repeat(81))).toBe('tooLong');
    expect(getSpaceFieldErrorCode(createSpaceSchema.shape.slug, 'engineering')).toBeUndefined();
  });

  it('resolves the too-short message only, leaving unreachable too-long codes unmapped', () => {
    expect(resolveSpaceFieldErrorMessage('tooShort', 'Name is too short.')).toBe('Name is too short.');
    expect(resolveSpaceFieldErrorMessage('tooLong', 'Name is too short.')).toBeUndefined();
    expect(resolveSpaceFieldErrorMessage(undefined, 'Name is too short.')).toBeUndefined();
  });
});
