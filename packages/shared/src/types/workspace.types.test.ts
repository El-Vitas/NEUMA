import { describe, expect, test } from 'bun:test';
import { USER_ROLE } from './user-role.types.js';
import { WORKSPACE_CAPABILITY_BY_ROLE } from './workspace.types.js';

describe('workspace contracts', () => {
  test('maps every persisted role to its canonical capability', () => {
    expect(WORKSPACE_CAPABILITY_BY_ROLE).toEqual({
      [USER_ROLE.ADMIN]: 'admin',
      [USER_ROLE.WORKER]: 'editor',
      [USER_ROLE.CLIENT]: 'viewer',
    });
  });
});
