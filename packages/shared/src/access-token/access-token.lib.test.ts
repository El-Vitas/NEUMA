import { describe, expect, test } from 'bun:test';
import { USER_ROLE } from '../types/user-role.types.js';
import {
  ACCESS_TOKEN_LEVELS,
  ACCESS_TOKEN_NAME_MAX_LENGTH,
  ACCESS_TOKEN_PERMISSION_VALUES,
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

/** Ancestors are ordered from nearest to root. */
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

  test('lets someone who only reads give exactly the reading permissions and nothing else', () => {
    const givenByReader = ACCESS_TOKEN_PERMISSION_VALUES.filter((permission) =>
      canRoleGrantAccessTokenPermission(USER_ROLE.CLIENT, permission),
    );

    expect(givenByReader).toEqual([ACCESS_TOKEN_PERMISSIONS.pagesRead, ACCESS_TOKEN_PERMISSIONS.collectionsRead]);
  });

  test('does not let someone who only reads give writing', () => {
    expect(canRoleGrantAccessTokenPermission(USER_ROLE.CLIENT, ACCESS_TOKEN_PERMISSIONS.pagesWrite)).toBe(false);
    expect(canRoleGrantAccessTokenPermission(USER_ROLE.WORKER, ACCESS_TOKEN_PERMISSIONS.pagesWrite)).toBe(true);
  });

  test('keeps managing pages apart from writing them, given only by someone who writes and only in full access', () => {
    const { pagesManage } = ACCESS_TOKEN_PERMISSIONS;

    expect(canRoleGrantAccessTokenPermission(USER_ROLE.CLIENT, pagesManage)).toBe(false);
    expect(canRoleGrantAccessTokenPermission(USER_ROLE.WORKER, pagesManage)).toBe(true);
    expect(readWrite).not.toContain(pagesManage);
    expect(listAccessTokenLevelPermissions(ACCESS_TOKEN_LEVELS.full)).toContain(pagesManage);
  });
});

describe('el nombre de un token', () => {
  test('accepts a name that says something and fits', () => {
    expect(isAccessTokenNameAcceptable('Claude en mi portátil')).toBe(true);
    expect(isAccessTokenNameAcceptable('a'.repeat(ACCESS_TOKEN_NAME_MAX_LENGTH))).toBe(true);
  });

  test('refuses an empty name, one too long, and one with control characters', () => {
    expect(isAccessTokenNameAcceptable('')).toBe(false);
    expect(isAccessTokenNameAcceptable('a'.repeat(ACCESS_TOKEN_NAME_MAX_LENGTH + 1))).toBe(false);
    expect(isAccessTokenNameAcceptable('Claude\nadmin')).toBe(false);
    expect(isAccessTokenNameAcceptable('Claude\u001b[31m')).toBe(false);
  });

  test('refuses a name with invisible characters, and keeps the one that joins an emoji', () => {
    const turnsTextAround = String.fromCodePoint(0x202e);
    const takesNoRoom = String.fromCodePoint(0x200b);
    const joinsAnEmoji = String.fromCodePoint(0x200d);
    const womanTechnologist = String.fromCodePoint(0x1f469, 0x200d, 0x1f4bb);

    expect(isAccessTokenNameAcceptable(`Claude${turnsTextAround}nimda`)).toBe(false);
    expect(isAccessTokenNameAcceptable(`Clau${takesNoRoom}de`)).toBe(false);
    expect(isAccessTokenNameAcceptable(`Equipo ${womanTechnologist}`)).toBe(true);
    expect(womanTechnologist).toContain(joinsAnEmoji);
  });

  test('refuses the emoji joiner when it does not stand between two emojis', () => {
    const joinsAnEmoji = String.fromCodePoint(0x200d);
    const womanWithSkinTone = String.fromCodePoint(0x1f469, 0x1f3fd, 0x200d, 0x1f4bb);
    const rainbowFlag = String.fromCodePoint(0x1f3f3, 0xfe0f, 0x200d, 0x1f308);

    expect(isAccessTokenNameAcceptable(`Cla${joinsAnEmoji}ude`)).toBe(false);
    expect(isAccessTokenNameAcceptable(`Claude${joinsAnEmoji}`)).toBe(false);
    expect(isAccessTokenNameAcceptable(`${joinsAnEmoji}Claude`)).toBe(false);
    expect(isAccessTokenNameAcceptable(`Equipo ${womanWithSkinTone}`)).toBe(true);
    expect(isAccessTokenNameAcceptable(`Equipo ${rainbowFlag}`)).toBe(true);
  });

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

  test('knows when every rule gives nothing', () => {
    expect(hasAccessTokenAnyPermission({ allSpaces: [], pages: [{ pageId: 'hr', permissions: [] }], spaces: [] })).toBe(
      false,
    );
    expect(hasAccessTokenAnyPermission(writingInProduct)).toBe(true);
  });
});
