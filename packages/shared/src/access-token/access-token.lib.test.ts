import { describe, expect, test } from 'bun:test';
import { USER_ROLE } from '../types/user-role.types.js';
import {
  ACCESS_TOKEN_LEVELS,
  ACCESS_TOKEN_NAME_MAX_LENGTH,
  ACCESS_TOKEN_PERMISSIONS,
} from './access-token.definitions.js';
import {
  canAccessTokenAct,
  canRoleGrantAccessTokenPermission,
  hasAccessTokenAnyPermission,
  isAccessTokenNameAcceptable,
  isAccessTokenNameTaken,
  listAccessTokenGrantedPermissions,
  listAccessTokenLevelPermissions,
  readAccessTokenLevel,
  readAccessTokenPermissionsAt,
} from './access-token.lib.js';
import type { AccessTokenAccess, AccessTokenPlace } from './access-token.types.js';

const read = listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.read);
const readWrite = listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.readWrite);
const none = listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.none);

/** Una página en un espacio, con sus ancestros de la más cercana a la raíz. */
const pageAt = (spaceId: string, ...lineage: string[]): AccessTokenPlace => ({ lineage, spaceId });

describe('los niveles de acceso', () => {
  test('each level includes the one below it', () => {
    const full = listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.full);

    expect(read.every((permission) => readWrite.includes(permission))).toBe(true);
    expect(readWrite.every((permission) => full.includes(permission))).toBe(true);
  });

  test('names a set of permissions by its level, whatever order it came in', () => {
    expect(readAccessTokenLevel([...readWrite].reverse())).toBe(ACCESS_TOKEN_LEVELS.readWrite);
  });

  /** Sin permisos no es un error: es una exclusión, y tiene nombre propio. */
  test('calls an empty set no access', () => {
    expect(readAccessTokenLevel([])).toBe(ACCESS_TOKEN_LEVELS.none);
    expect(none).toEqual([]);
  });

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

describe('el nombre de un token', () => {
  test('accepts a name that says something and fits', () => {
    expect(isAccessTokenNameAcceptable('Claude en mi portátil')).toBe(true);
    expect(isAccessTokenNameAcceptable('a'.repeat(ACCESS_TOKEN_NAME_MAX_LENGTH))).toBe(true);
  });

  /** Un salto de línea o un carácter de control rompe la lista y los registros donde el nombre aparece. */
  test('refuses an empty name, one too long, and one with control characters', () => {
    expect(isAccessTokenNameAcceptable('')).toBe(false);
    expect(isAccessTokenNameAcceptable('a'.repeat(ACCESS_TOKEN_NAME_MAX_LENGTH + 1))).toBe(false);
    expect(isAccessTokenNameAcceptable('Claude\nadmin')).toBe(false);
    expect(isAccessTokenNameAcceptable('Claude\u001b[31m')).toBe(false);
  });

  /** Dos tokens que se leen igual en la lista son dos tokens que se confunden al revocar. */
  test('treats names that read the same as the same name', () => {
    expect(isAccessTokenNameTaken('claude  en MI portátil', ['Claude en mi portátil'])).toBe(true);
    expect(isAccessTokenNameTaken('Claude en el servidor', ['Claude en mi portátil'])).toBe(false);
  });
});

describe('la regla más cercana manda', () => {
  const everywhereReadingButHr: AccessTokenAccess = {
    allSpaces: read,
    pages: [
      { pageId: 'hr', permissions: none },
      { pageId: 'hr-holidays', permissions: read },
    ],
    spaces: [{ permissions: none, spaceId: 'finance' }],
  };

  test('uses what is given in all spaces where nothing closer says otherwise', () => {
    expect(readAccessTokenPermissionsAt(everywhereReadingButHr, pageAt('product', 'roadmap'))).toEqual(read);
  });

  test('excludes a whole space with a rule that gives nothing', () => {
    expect(readAccessTokenPermissionsAt(everywhereReadingButHr, pageAt('finance', 'budget'))).toEqual([]);
  });

  /** La exclusión alcanza a todo lo que cuelga de la página, a cualquier profundidad. */
  test('excludes a page and everything under it', () => {
    expect(readAccessTokenPermissionsAt(everywhereReadingButHr, pageAt('product', 'hr'))).toEqual([]);
    expect(readAccessTokenPermissionsAt(everywhereReadingButHr, pageAt('product', 'salaries', 'hr'))).toEqual([]);
    expect(readAccessTokenPermissionsAt(everywhereReadingButHr, pageAt('product', 'bonus', 'salaries', 'hr'))).toEqual(
      [],
    );
  });

  test('reopens a page inside an excluded one, because it is the closer rule', () => {
    expect(readAccessTokenPermissionsAt(everywhereReadingButHr, pageAt('product', 'hr-holidays', 'hr'))).toEqual(read);
    expect(
      readAccessTokenPermissionsAt(everywhereReadingButHr, pageAt('product', 'summer', 'hr-holidays', 'hr')),
    ).toEqual(read);
  });

  /** Lo dado en un espacio reemplaza a lo de todos: así se puede también achicar. */
  test('narrows inside a space instead of adding to what all spaces give', () => {
    const writingEverywhereReadingFinance: AccessTokenAccess = {
      allSpaces: readWrite,
      pages: [],
      spaces: [{ permissions: read, spaceId: 'finance' }],
    };

    expect(readAccessTokenPermissionsAt(writingEverywhereReadingFinance, pageAt('finance', 'budget'))).toEqual(read);
  });

  test('gives nothing where no rule reaches', () => {
    const onlyOnePage: AccessTokenAccess = {
      allSpaces: [],
      pages: [{ pageId: 'spec', permissions: read }],
      spaces: [],
    };

    expect(readAccessTokenPermissionsAt(onlyOnePage, pageAt('product', 'spec'))).toEqual(read);
    expect(readAccessTokenPermissionsAt(onlyOnePage, pageAt('product', 'child', 'spec'))).toEqual(read);
    expect(readAccessTokenPermissionsAt(onlyOnePage, pageAt('product', 'sibling'))).toEqual([]);
  });
});

describe('lo que un token puede hacer, hoy', () => {
  const writingInProduct: AccessTokenAccess = {
    allSpaces: read,
    pages: [],
    spaces: [{ permissions: readWrite, spaceId: 'product' }],
  };

  test('acts only where it was given that permission', () => {
    const write = ACCESS_TOKEN_PERMISSIONS.pagesWrite;

    expect(canAccessTokenAct(writingInProduct, USER_ROLE.WORKER, pageAt('product', 'a'), write)).toBe(true);
    expect(canAccessTokenAct(writingInProduct, USER_ROLE.WORKER, pageAt('engineering', 'b'), write)).toBe(false);
  });

  /**
   * Lo que el dueño puede hacer se mira hoy, no cuando creó el token: si le
   * bajaron el rol a solo lectura, su token deja de escribir en la llamada siguiente.
   */
  test('stops writing the moment its owner can no longer write', () => {
    expect(
      canAccessTokenAct(
        writingInProduct,
        USER_ROLE.CLIENT,
        pageAt('product', 'a'),
        ACCESS_TOKEN_PERMISSIONS.pagesWrite,
      ),
    ).toBe(false);
  });

  test('lists every permission it holds anywhere, to know which tools to offer', () => {
    const granted = listAccessTokenGrantedPermissions({
      allSpaces: [],
      pages: [{ pageId: 'spec', permissions: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite] }],
      spaces: [{ permissions: read, spaceId: 'product' }],
    });

    expect(granted).toContain(ACCESS_TOKEN_PERMISSIONS.pagesRead);
    expect(granted).toContain(ACCESS_TOKEN_PERMISSIONS.collectionsWrite);
    expect(granted).not.toContain(ACCESS_TOKEN_PERMISSIONS.pagesTrash);
  });

  /** Un token hecho solo de exclusiones no abre nada: no vale la pena crearlo. */
  test('knows when every rule gives nothing', () => {
    expect(hasAccessTokenAnyPermission({ allSpaces: [], pages: [{ pageId: 'hr', permissions: [] }], spaces: [] })).toBe(
      false,
    );
    expect(hasAccessTokenAnyPermission(writingInProduct)).toBe(true);
  });
});
