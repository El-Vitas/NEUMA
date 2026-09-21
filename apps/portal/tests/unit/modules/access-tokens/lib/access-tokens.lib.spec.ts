import { describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_LEVELS, ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@company-brain/shared';
import {
  ACCESS_TOKEN_ALL_SPACES,
  ACCESS_TOKEN_EXPIRY_OPTIONS,
} from '@/modules/access-tokens/constants/access-tokens.constants';
import {
  accessToDraftRows,
  canSubmitAccessDraft,
  draftRowsToAccess,
  listGrantableLevels,
  listGrantablePermissions,
  readAccessTokenExpiry,
} from '@/modules/access-tokens/lib/access-tokens.lib';
import type { AccessTokenDraftRow } from '@/modules/access-tokens/types/access-tokens.types';

const row = (overrides: Partial<AccessTokenDraftRow>): AccessTokenDraftRow => ({
  customPermissions: [],
  key: 'row',
  level: ACCESS_TOKEN_LEVELS.read,
  target: ACCESS_TOKEN_ALL_SPACES,
  ...overrides,
});

describe('de las filas de la pantalla a lo que se manda', () => {
  it('turns an everywhere row into permissions for all spaces, and named rows into grants', () => {
    const access = draftRowsToAccess([
      row({ key: 'a', level: ACCESS_TOKEN_LEVELS.read, target: ACCESS_TOKEN_ALL_SPACES }),
      row({ key: 'b', level: ACCESS_TOKEN_LEVELS.readWrite, target: 'product' }),
    ]);

    expect(access.allSpaces).toEqual([ACCESS_TOKEN_PERMISSIONS.pagesRead, ACCESS_TOKEN_PERMISSIONS.collectionsRead]);
    expect(access.spaces).toEqual([
      {
        permissions: [
          ACCESS_TOKEN_PERMISSIONS.pagesRead,
          ACCESS_TOKEN_PERMISSIONS.collectionsRead,
          ACCESS_TOKEN_PERMISSIONS.pagesWrite,
          ACCESS_TOKEN_PERMISSIONS.collectionsWrite,
        ],
        spaceId: 'product',
      },
    ]);
  });

  it('sends the boxes ticked by hand when the level is custom', () => {
    const access = draftRowsToAccess([
      row({
        customPermissions: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite],
        level: ACCESS_TOKEN_LEVELS.custom,
        target: 'product',
      }),
    ]);

    expect(access.spaces[0]?.permissions).toEqual([ACCESS_TOKEN_PERMISSIONS.collectionsWrite]);
  });
});

describe('de lo guardado a las filas, para editarlo', () => {
  it('rebuilds one row per place, naming the level when the permissions match one', () => {
    const rows = accessToDraftRows({
      allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead, ACCESS_TOKEN_PERMISSIONS.collectionsRead],
      spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite], spaceId: 'product', spaceName: 'Producto' }],
    });

    expect(rows.map((one) => [one.target, one.level])).toEqual([
      [ACCESS_TOKEN_ALL_SPACES, ACCESS_TOKEN_LEVELS.read],
      ['product', ACCESS_TOKEN_LEVELS.custom],
    ]);
    expect(rows[1]?.customPermissions).toEqual([ACCESS_TOKEN_PERMISSIONS.collectionsWrite]);
  });
});

describe('lo que alguien puede dar', () => {
  /** Quien solo lee no ve ofrecido lo que no podría dar: no es un botón que después falla. */
  it('offers someone who only reads the reading level and custom, nothing that writes', () => {
    expect(listGrantableLevels(USER_ROLE.CLIENT)).toEqual([ACCESS_TOKEN_LEVELS.read, ACCESS_TOKEN_LEVELS.custom]);
    expect(listGrantablePermissions(USER_ROLE.CLIENT)).not.toContain(ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  });

  it('offers someone who writes every level', () => {
    expect(listGrantableLevels(USER_ROLE.WORKER)).toEqual([
      ACCESS_TOKEN_LEVELS.read,
      ACCESS_TOKEN_LEVELS.readWrite,
      ACCESS_TOKEN_LEVELS.full,
      ACCESS_TOKEN_LEVELS.custom,
    ]);
  });
});

describe('hasta cuándo sirve', () => {
  const now = new Date('2026-09-21T12:00:00.000Z');

  it('never expires when asked for no date', () => {
    expect(readAccessTokenExpiry(ACCESS_TOKEN_EXPIRY_OPTIONS.never, now)).toBeNull();
  });

  it('expires the chosen number of days after now', () => {
    expect(readAccessTokenExpiry(ACCESS_TOKEN_EXPIRY_OPTIONS.month, now)?.toISOString()).toBe(
      '2026-10-21T12:00:00.000Z',
    );
  });
});

describe('cuándo se puede mandar', () => {
  it('needs at least one row that gives something', () => {
    expect(canSubmitAccessDraft([])).toBe(false);
    expect(canSubmitAccessDraft([row({ customPermissions: [], level: ACCESS_TOKEN_LEVELS.custom })])).toBe(false);
    expect(canSubmitAccessDraft([row({})])).toBe(true);
  });

  /** El mismo lugar dos veces deja sin decir cuál fila manda. */
  it('does not allow the same place twice', () => {
    expect(canSubmitAccessDraft([row({ key: 'a', target: 'product' }), row({ key: 'b', target: 'product' })])).toBe(
      false,
    );
  });
});
