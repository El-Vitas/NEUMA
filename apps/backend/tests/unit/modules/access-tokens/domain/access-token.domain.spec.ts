import { describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_NAME_MAX_LENGTH, ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@neuma/shared';
import {
  isAccessTokenUsable,
  listPermissionsBeyondRole,
  validateAccessTokenAccess,
  validateAccessTokenExpiry,
  validateAccessTokenName,
} from '@/modules/access-tokens/domain/access-token.domain';

const now = new Date('2026-09-21T12:00:00.000Z');
const read = ACCESS_TOKEN_PERMISSIONS.pagesRead;
const pageId = '0199a1c2-0000-7000-8000-000000000001';

describe('si un token todavía sirve', () => {
  it('serves while it is neither revoked nor expired', () => {
    expect(isAccessTokenUsable({ expiresAt: null, revokedAt: null }, now)).toBe(true);
  });

  it('stops serving the moment it is revoked', () => {
    expect(isAccessTokenUsable({ expiresAt: null, revokedAt: new Date('2026-09-20T00:00:00.000Z') }, now)).toBe(false);
  });

  it('stops serving once its expiry has passed, and at the exact instant it expires', () => {
    expect(isAccessTokenUsable({ expiresAt: new Date('2026-09-21T11:59:59.000Z'), revokedAt: null }, now)).toBe(false);
    expect(isAccessTokenUsable({ expiresAt: now, revokedAt: null }, now)).toBe(false);
    expect(isAccessTokenUsable({ expiresAt: new Date('2026-09-22T00:00:00.000Z'), revokedAt: null }, now)).toBe(true);
  });
});

describe('el nombre de un token', () => {
  it('keeps the name without the spaces around it', () => {
    const result = validateAccessTokenName('  Claude en mi portátil  ');

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toBe('Claude en mi portátil');
  });

  it('refuses a name made only of spaces', () => {
    expect(validateAccessTokenName('   ').getError().code).toBe('ACCESS_TOKEN_NAME_INVALID');
  });

  it('refuses a name longer than the limit, counted after trimming', () => {
    expect(validateAccessTokenName('a'.repeat(ACCESS_TOKEN_NAME_MAX_LENGTH)).isOk()).toBe(true);
    expect(validateAccessTokenName('a'.repeat(ACCESS_TOKEN_NAME_MAX_LENGTH + 1)).isFail()).toBe(true);
  });

  it('refuses a name with line breaks or control characters', () => {
    expect(validateAccessTokenName('Claude\nadmin').isFail()).toBe(true);
    expect(validateAccessTokenName('Claude\u0000').isFail()).toBe(true);
    expect(validateAccessTokenName('Claude\u001b[31m').isFail()).toBe(true);
  });
});

describe('hasta cuándo sirve un token', () => {
  it('accepts no expiry and any moment after now', () => {
    expect(validateAccessTokenExpiry(null, now).isOk()).toBe(true);
    expect(validateAccessTokenExpiry(new Date('2099-01-01T00:00:00.000Z'), now).isOk()).toBe(true);
  });

  it('refuses a moment that already passed, or now itself', () => {
    expect(validateAccessTokenExpiry(new Date('2026-09-21T11:00:00.000Z'), now).getError().code).toBe(
      'ACCESS_TOKEN_EXPIRY_IN_PAST',
    );
    expect(validateAccessTokenExpiry(now, now).isFail()).toBe(true);
  });

  it('refuses a date that is not a date', () => {
    expect(validateAccessTokenExpiry(new Date('not a date'), now).isFail()).toBe(true);
  });
});

describe('lo que se pide dar a un token', () => {
  it('accepts rules for all spaces, one space and one page, exclusions included', () => {
    const result = validateAccessTokenAccess({
      allSpaces: [read],
      pages: [{ pageId, permissions: [] }],
      spaces: [{ permissions: [], spaceId: 'hr' }],
    });

    expect(result.isOk()).toBe(true);
  });

  it('refuses an access with nothing in it, saying so', () => {
    const result = validateAccessTokenAccess({ allSpaces: [], pages: [], spaces: [] });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('ACCESS_TOKEN_ACCESS_INVALID');
  });

  it('refuses anything that is not the shape of an access', () => {
    expect(validateAccessTokenAccess(null).isFail()).toBe(true);
    expect(validateAccessTokenAccess({ allSpaces: [read] }).isFail()).toBe(true);
    expect(
      validateAccessTokenAccess({
        allSpaces: [read],
        pages: [{ pageId: '1 OR 1', permissions: [] }],
        spaces: [],
      }).isFail(),
    ).toBe(true);
  });
});

describe('lo que el dueño no puede dar', () => {
  it('names every writing permission someone who only reads tried to give, wherever it was', () => {
    const beyond = listPermissionsBeyondRole(
      {
        allSpaces: [read],
        pages: [{ pageId, permissions: [ACCESS_TOKEN_PERMISSIONS.pagesWrite] }],
        spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite], spaceId: 'product' }],
      },
      USER_ROLE.CLIENT,
    );

    expect(beyond).toEqual([ACCESS_TOKEN_PERMISSIONS.collectionsWrite, ACCESS_TOKEN_PERMISSIONS.pagesWrite]);
  });

  it('names nothing when every permission is within reach', () => {
    const beyond = listPermissionsBeyondRole(
      { allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesWrite], pages: [], spaces: [] },
      USER_ROLE.WORKER,
    );

    expect(beyond).toEqual([]);
  });
});
