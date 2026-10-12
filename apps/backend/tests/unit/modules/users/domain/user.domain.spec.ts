import { describe, expect, it } from 'bun:test';
import { assertNoAdminYet } from '@/modules/users/domain/user.domain';

describe('assertNoAdminYet', () => {
  it('allows the first admin while there is none', () => {
    expect(assertNoAdminYet(0)).toBeNull();
  });

  it('refuses once an admin exists, since from then on admins create accounts', () => {
    expect(assertNoAdminYet(1)?.code).toBe('USER_ADMIN_ALREADY_EXISTS');
  });
});
