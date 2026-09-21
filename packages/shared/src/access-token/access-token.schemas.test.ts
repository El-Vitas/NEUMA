import { describe, expect, test } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, ACCESS_TOKEN_SPACE_GRANT_LIMIT } from './access-token.definitions.js';
import { accessTokenAccessSchema } from './access-token.schemas.js';

const read = ACCESS_TOKEN_PERMISSIONS.pagesRead;

describe('lo que se acepta como acceso de un token', () => {
  test('accepts permissions everywhere, per space, or both', () => {
    expect(accessTokenAccessSchema.safeParse({ allSpaces: [read], spaces: [] }).success).toBe(true);
    expect(
      accessTokenAccessSchema.safeParse({ allSpaces: [], spaces: [{ permissions: [read], spaceId: 'a' }] }).success,
    ).toBe(true);
  });

  /** Un token sin ningún permiso es una llave que no abre nada: mejor no crearla que tener que explicarla. */
  test('refuses a token that can do nothing anywhere', () => {
    expect(accessTokenAccessSchema.safeParse({ allSpaces: [], spaces: [] }).success).toBe(false);
  });

  test('refuses a permission the catalogue does not know', () => {
    expect(accessTokenAccessSchema.safeParse({ allSpaces: ['pages:delete-forever'], spaces: [] }).success).toBe(false);
  });

  /** El mismo espacio dos veces deja sin decir cuál de las dos filas manda. */
  test('refuses the same space named twice', () => {
    const twice = {
      allSpaces: [],
      spaces: [
        { permissions: [read], spaceId: 'a' },
        { permissions: [read], spaceId: 'a' },
      ],
    };

    expect(accessTokenAccessSchema.safeParse(twice).success).toBe(false);
  });

  test('refuses a space named with no permissions in it', () => {
    expect(
      accessTokenAccessSchema.safeParse({ allSpaces: [read], spaces: [{ permissions: [], spaceId: 'a' }] }).success,
    ).toBe(false);
  });

  test('refuses more named spaces than the limit', () => {
    const spaces = Array.from({ length: ACCESS_TOKEN_SPACE_GRANT_LIMIT + 1 }, (_unused, position) => ({
      permissions: [read],
      spaceId: `space-${String(position)}`,
    }));

    expect(accessTokenAccessSchema.safeParse({ allSpaces: [], spaces }).success).toBe(false);
  });

  test('keeps each permission once, however many times it came', () => {
    const parsed = accessTokenAccessSchema.parse({ allSpaces: [read, read], spaces: [] });

    expect(parsed.allSpaces).toEqual([read]);
  });
});
