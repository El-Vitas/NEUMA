import { describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@company-brain/shared';
import {
  isAccessTokenUsable,
  listPermissionsBeyondRole,
  validateAccessTokenAccess,
} from '@/modules/access-tokens/domain/access-token.domain';

const now = new Date('2026-09-21T12:00:00.000Z');

describe('si un token todavía sirve', () => {
  it('serves while it is neither revoked nor expired', () => {
    expect(isAccessTokenUsable({ expiresAt: null, revokedAt: null }, now)).toBe(true);
  });

  it('stops serving the moment it is revoked', () => {
    expect(isAccessTokenUsable({ expiresAt: null, revokedAt: new Date('2026-09-20T00:00:00.000Z') }, now)).toBe(false);
  });

  it('stops serving once its expiry has passed', () => {
    expect(isAccessTokenUsable({ expiresAt: new Date('2026-09-21T11:59:59.000Z'), revokedAt: null }, now)).toBe(false);
    expect(isAccessTokenUsable({ expiresAt: new Date('2026-09-22T00:00:00.000Z'), revokedAt: null }, now)).toBe(true);
  });
});

describe('lo que se pide dar a un token', () => {
  it('accepts a well formed access', () => {
    const result = validateAccessTokenAccess({ allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead], spaces: [] });

    expect(result.isOk()).toBe(true);
  });

  it('refuses an access with nothing in it, saying so', () => {
    const result = validateAccessTokenAccess({ allSpaces: [], spaces: [] });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('ACCESS_TOKEN_ACCESS_INVALID');
  });
});

describe('lo que el dueño no puede dar', () => {
  /** Un token no da más que su dueño: quien solo lee no pide escribir en ningún espacio. */
  it('names every writing permission someone who only reads tried to give', () => {
    const beyond = listPermissionsBeyondRole(
      {
        allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
        spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite], spaceId: 'product' }],
      },
      USER_ROLE.CLIENT,
    );

    expect(beyond).toEqual([ACCESS_TOKEN_PERMISSIONS.collectionsWrite]);
  });

  it('names nothing when every permission is within reach', () => {
    const beyond = listPermissionsBeyondRole(
      { allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesWrite], spaces: [] },
      USER_ROLE.WORKER,
    );

    expect(beyond).toEqual([]);
  });
});
