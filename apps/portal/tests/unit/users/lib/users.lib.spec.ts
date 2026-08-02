import { describe, expect, it } from 'bun:test';
import {
  buildUsersApiEndpoint,
  buildUsersInitialColumnFilters,
  buildUsersPageUrl,
  formatUsersSubtitle,
  isCreateUserInputValid,
} from '@/modules/users/lib/users.lib';

describe('buildUsersApiEndpoint', () => {
  it('builds the endpoint with page, pageSize and search', () => {
    expect(buildUsersApiEndpoint({ page: 2, pageSize: 20, search: 'ana' })).toBe(
      '/api/v1/users?page=2&pageSize=20&search=ana',
    );
  });

  it('omits search when empty', () => {
    expect(buildUsersApiEndpoint({ page: 1, pageSize: 20, search: '' })).toBe('/api/v1/users?page=1&pageSize=20');
  });
});

describe('buildUsersPageUrl', () => {
  it('maps the name column filter to the search param', () => {
    expect(
      buildUsersPageUrl({ pageIndex: 0, pageSize: 20, sorting: [], columnFilters: [{ id: 'name', value: 'ana' }] }),
    ).toBe('/usuarios?page=1&pageSize=20&search=ana');
  });
});

describe('buildUsersInitialColumnFilters', () => {
  it('returns an empty list when search is empty', () => {
    expect(buildUsersInitialColumnFilters('')).toEqual([]);
  });

  it('returns the name filter when search is present', () => {
    expect(buildUsersInitialColumnFilters('ana')).toEqual([{ id: 'name', value: 'ana' }]);
  });
});

describe('formatUsersSubtitle', () => {
  it('uses singular for one user', () => {
    expect(formatUsersSubtitle(1)).toBe('1 usuario registrado');
  });

  it('uses plural otherwise', () => {
    expect(formatUsersSubtitle(0)).toBe('0 usuarios registrados');
  });
});

describe('isCreateUserInputValid', () => {
  it('accepts a valid input', () => {
    expect(isCreateUserInputValid({ name: 'Test User', email: 'test@example.com', password: 'password123' })).toBe(
      true,
    );
  });

  it('rejects a short password', () => {
    expect(isCreateUserInputValid({ name: 'Test User', email: 'test@example.com', password: 'short' })).toBe(false);
  });
});
