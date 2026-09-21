import { describe, expect, test } from 'bun:test';
import { USER_ROLE } from '../types/user-role.types.js';
import { ACCESS_TOKEN_LEVELS, ACCESS_TOKEN_PERMISSIONS } from './access-token.definitions.js';
import {
  canAccessTokenAct,
  canRoleGrantAccessTokenPermission,
  listAccessTokenGrantedPermissions,
  listAccessTokenLevelPermissions,
  readAccessTokenLevel,
  readAccessTokenSpacePermissions,
} from './access-token.lib.js';
import type { AccessTokenAccess } from './access-token.types.js';

const readOnlyEverywhereAndWritingInProduct: AccessTokenAccess = {
  allSpaces: listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.read),
  spaces: [{ permissions: listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.readWrite), spaceId: 'product' }],
};

describe('los niveles de acceso', () => {
  test('each level includes the one below it', () => {
    const read = listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.read);
    const readWrite = listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.readWrite);
    const full = listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.full);

    expect(read.every((permission) => readWrite.includes(permission))).toBe(true);
    expect(readWrite.every((permission) => full.includes(permission))).toBe(true);
  });

  test('names a set of permissions by its level, whatever order it came in', () => {
    const readWrite = [...listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.readWrite)].reverse();

    expect(readAccessTokenLevel(readWrite)).toBe(ACCESS_TOKEN_LEVELS.readWrite);
  });

  /** Un conjunto que no calza con ningún nivel es uno armado a mano, y así se dice. */
  test('calls a set that matches no level custom', () => {
    expect(readAccessTokenLevel([ACCESS_TOKEN_PERMISSIONS.collectionsWrite])).toBe(ACCESS_TOKEN_LEVELS.custom);
  });
});

describe('lo que alguien puede dar', () => {
  test('lets anyone give reading', () => {
    expect(canRoleGrantAccessTokenPermission(USER_ROLE.CLIENT, ACCESS_TOKEN_PERMISSIONS.pagesRead)).toBe(true);
  });

  /** Un token no da más que su dueño: quien solo lee no fabrica un token que escriba. */
  test('does not let someone who only reads give writing', () => {
    expect(canRoleGrantAccessTokenPermission(USER_ROLE.CLIENT, ACCESS_TOKEN_PERMISSIONS.pagesWrite)).toBe(false);
    expect(canRoleGrantAccessTokenPermission(USER_ROLE.WORKER, ACCESS_TOKEN_PERMISSIONS.pagesWrite)).toBe(true);
  });
});

describe('lo que un token puede hacer en un espacio', () => {
  test('adds what it has everywhere to what it has in that space', () => {
    const inProduct = readAccessTokenSpacePermissions(readOnlyEverywhereAndWritingInProduct, 'product');
    const inEngineering = readAccessTokenSpacePermissions(readOnlyEverywhereAndWritingInProduct, 'engineering');

    expect(inProduct).toContain(ACCESS_TOKEN_PERMISSIONS.pagesWrite);
    expect(inEngineering).toContain(ACCESS_TOKEN_PERMISSIONS.pagesRead);
    expect(inEngineering).not.toContain(ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  });

  test('acts only where it was given that permission', () => {
    expect(
      canAccessTokenAct(
        readOnlyEverywhereAndWritingInProduct,
        USER_ROLE.WORKER,
        'product',
        ACCESS_TOKEN_PERMISSIONS.pagesWrite,
      ),
    ).toBe(true);
    expect(
      canAccessTokenAct(
        readOnlyEverywhereAndWritingInProduct,
        USER_ROLE.WORKER,
        'engineering',
        ACCESS_TOKEN_PERMISSIONS.pagesWrite,
      ),
    ).toBe(false);
  });

  /**
   * Lo que el dueño puede hacer se mira hoy, no cuando creó el token: si le
   * bajaron el rol a solo lectura, su token deja de escribir en la llamada siguiente.
   */
  test('stops writing the moment its owner can no longer write', () => {
    expect(
      canAccessTokenAct(
        readOnlyEverywhereAndWritingInProduct,
        USER_ROLE.CLIENT,
        'product',
        ACCESS_TOKEN_PERMISSIONS.pagesWrite,
      ),
    ).toBe(false);
  });

  test('lists every permission it holds anywhere, to know which tools to offer', () => {
    const granted = listAccessTokenGrantedPermissions(readOnlyEverywhereAndWritingInProduct);

    expect(granted).toContain(ACCESS_TOKEN_PERMISSIONS.pagesRead);
    expect(granted).toContain(ACCESS_TOKEN_PERMISSIONS.pagesWrite);
    expect(granted).not.toContain(ACCESS_TOKEN_PERMISSIONS.pagesTrash);
  });
});
