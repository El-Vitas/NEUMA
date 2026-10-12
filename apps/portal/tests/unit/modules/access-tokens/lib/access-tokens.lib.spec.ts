import { describe, expect, it } from 'bun:test';
import {
  ACCESS_TOKEN_LEVELS,
  ACCESS_TOKEN_PAGE_GRANT_LIMIT,
  ACCESS_TOKEN_PERMISSIONS,
  ACCESS_TOKEN_SPACE_GRANT_LIMIT,
  USER_ROLE,
} from '@neuma/shared';
import {
  ACCESS_TOKEN_EXPIRY_OPTIONS,
  ACCESS_TOKEN_TARGET_KINDS,
  MCP_SERVER_KEY,
} from '@/modules/access-tokens/constants/access-tokens.constants';
import {
  accessToDraftRows,
  buildAccessTokenMcpConfig,
  canAddDraftRow,
  canSubmitAccessDraft,
  canSubmitAccessTokenCreate,
  draftRowsToAccess,
  excludePageOptions,
  findNewRowTarget,
  formatDateInputValue,
  hasChoiceHint,
  isDraftRowMissingPermissions,
  listAvailableTargetKinds,
  listGrantableLevels,
  listGrantablePermissions,
  listPagesTakenByOtherRows,
  listRowSpaceOptions,
  nameDraftTarget,
  readDraftTargetForKind,
  readExpiresAtInput,
  readLevelMeaningfulFor,
  readPageSearchState,
  resolveAccessTokenExpiry,
  summarizeAccessToken,
} from '@/modules/access-tokens/lib/access-tokens.lib';
import type { AccessTokenDraftRow, AccessTokenPageOption } from '@/modules/access-tokens/types/access-tokens.types';

const read = ACCESS_TOKEN_PERMISSIONS.pagesRead;
const collectionsRead = ACCESS_TOKEN_PERMISSIONS.collectionsRead;
const spaces = [
  { id: 'product', name: 'Producto' },
  { id: 'sales', name: 'Ventas' },
];
const holidays: AccessTokenPageOption = {
  id: '0199a1c2-0000-7000-8000-000000000001',
  spaceName: 'RR. HH.',
  title: 'Vacaciones',
};

const row = (overrides: Partial<AccessTokenDraftRow>): AccessTokenDraftRow => ({
  customPermissions: [],
  key: 'row',
  level: ACCESS_TOKEN_LEVELS.read,
  target: { kind: 'ALL' },
  ...overrides,
});

describe('de las filas de la pantalla a lo que se manda', () => {
  it('sends each row to its place: all spaces, a space or a page', () => {
    const access = draftRowsToAccess([
      row({ key: 'a', target: { kind: 'ALL' } }),
      row({ key: 'b', level: ACCESS_TOKEN_LEVELS.none, target: { kind: 'SPACE', spaceId: 'sales' } }),
      row({ key: 'c', target: { kind: 'PAGE', page: holidays } }),
    ]);

    expect(access).toEqual({
      allSpaces: [read, collectionsRead],
      pages: [{ pageId: holidays.id, permissions: [read, collectionsRead] }],
      spaces: [{ permissions: [], spaceId: 'sales' }],
    });
  });

  it('sends the boxes ticked by hand when the level is custom', () => {
    const access = draftRowsToAccess([
      row({ customPermissions: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite], level: ACCESS_TOKEN_LEVELS.custom }),
    ]);

    expect(access.allSpaces).toEqual([ACCESS_TOKEN_PERMISSIONS.collectionsWrite]);
  });
});

describe('de lo guardado a las filas, para editarlo', () => {
  it('rebuilds one row per place, naming the level, exclusions included', () => {
    const rows = accessToDraftRows({
      allSpaces: [read, collectionsRead],
      pages: [{ pageId: holidays.id, pageTitle: 'Vacaciones', permissions: [], spaceName: 'RR. HH.' }],
      spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite], spaceId: 'product', spaceName: 'Producto' }],
    });

    expect(rows.map((one) => [one.target, one.level])).toEqual([
      [{ kind: 'ALL' }, ACCESS_TOKEN_LEVELS.read],
      [{ kind: 'SPACE', spaceId: 'product' }, ACCESS_TOKEN_LEVELS.custom],
      [{ kind: 'PAGE', page: holidays }, ACCESS_TOKEN_LEVELS.none],
    ]);
    expect(rows[1]?.customPermissions).toEqual([ACCESS_TOKEN_PERMISSIONS.collectionsWrite]);
  });
});

describe('lo que alguien puede dar', () => {
  it('offers someone who only reads the reading level, custom and no access, nothing that writes', () => {
    expect(listGrantableLevels(USER_ROLE.CLIENT, ACCESS_TOKEN_TARGET_KINDS.space)).toEqual([
      ACCESS_TOKEN_LEVELS.none,
      ACCESS_TOKEN_LEVELS.read,
      ACCESS_TOKEN_LEVELS.custom,
    ]);
    expect(listGrantablePermissions(USER_ROLE.CLIENT)).not.toContain(ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  });

  it('does not offer no access for all spaces', () => {
    expect(listGrantableLevels(USER_ROLE.WORKER, ACCESS_TOKEN_TARGET_KINDS.all)).toEqual([
      ACCESS_TOKEN_LEVELS.read,
      ACCESS_TOKEN_LEVELS.readWrite,
      ACCESS_TOKEN_LEVELS.full,
      ACCESS_TOKEN_LEVELS.custom,
    ]);
  });
});

describe('el nivel al cambiar de lugar', () => {
  it('turns no access into reading when the row moves to all spaces, and keeps it anywhere else', () => {
    expect(readLevelMeaningfulFor(ACCESS_TOKEN_LEVELS.none, { kind: 'ALL' })).toBe(ACCESS_TOKEN_LEVELS.read);
    expect(readLevelMeaningfulFor(ACCESS_TOKEN_LEVELS.none, { kind: 'SPACE', spaceId: 'sales' })).toBe(
      ACCESS_TOKEN_LEVELS.none,
    );
    expect(readLevelMeaningfulFor(ACCESS_TOKEN_LEVELS.full, { kind: 'ALL' })).toBe(ACCESS_TOKEN_LEVELS.full);
  });
});

describe('los lugares que ofrece cada fila', () => {
  it('offers every space except the ones other rows already name', () => {
    const rows = [
      row({ key: 'a', target: { kind: 'SPACE', spaceId: 'product' } }),
      row({ key: 'b', target: { kind: 'SPACE', spaceId: 'sales' } }),
    ];

    expect(listRowSpaceOptions(rows, 'b', spaces)).toEqual([{ id: 'sales', name: 'Ventas' }]);
  });

  it('does not offer a page another row already names', () => {
    const rows = [
      row({ key: 'a', target: { kind: 'PAGE', page: holidays } }),
      row({ key: 'b', target: { kind: 'PAGE', page: null } }),
    ];
    const other: AccessTokenPageOption = {
      id: '0199a1c2-0000-7000-8000-000000000002',
      spaceName: 'RR. HH.',
      title: 'Sueldos',
    };

    expect(listPagesTakenByOtherRows(rows, 'b')).toEqual([holidays.id]);
    expect(listPagesTakenByOtherRows(rows, 'a')).toEqual([]);
    expect(excludePageOptions([holidays, other], [holidays.id])).toEqual([other]);
  });

  it('says what the page search is doing when there is nothing to show', () => {
    const idle = { hasFailed: false, isSearching: false, pages: [] };

    expect(readPageSearchState('a', idle, [])).toBe('TOO_SHORT');
    expect(readPageSearchState('vaca', { ...idle, isSearching: true }, [])).toBe('SEARCHING');
    expect(readPageSearchState('vaca', { ...idle, hasFailed: true }, [])).toBe('FAILED');
    expect(readPageSearchState('vaca', idle, [])).toBe('EMPTY');
    expect(readPageSearchState('vaca', { ...idle, pages: [holidays] }, [holidays])).toBe('FOUND');
  });

  it('starts a new row on all spaces, then on the first free space, then on a page to choose', () => {
    expect(findNewRowTarget([], spaces)).toEqual({ kind: 'ALL' });
    expect(findNewRowTarget([row({})], spaces)).toEqual({ kind: 'SPACE', spaceId: 'product' });
    expect(
      findNewRowTarget(
        [
          row({}),
          row({ target: { kind: 'SPACE', spaceId: 'product' } }),
          row({ target: { kind: 'SPACE', spaceId: 'sales' } }),
        ],
        spaces,
      ),
    ).toEqual({ kind: 'PAGE', page: null });
  });

  it('names the place of a row, and nothing for all spaces or a page still to choose', () => {
    expect(nameDraftTarget({ kind: 'SPACE', spaceId: 'sales' }, spaces)).toBe('Ventas');
    expect(nameDraftTarget({ kind: 'PAGE', page: holidays }, spaces)).toBe('Vacaciones');
    expect(nameDraftTarget({ kind: 'PAGE', page: null }, spaces)).toBeNull();
    expect(nameDraftTarget({ kind: 'ALL' }, spaces)).toBeNull();
  });

  it('lists the kinds a row can move to, its own included', () => {
    const rows = [row({ key: 'a' }), row({ key: 'b', target: { kind: 'SPACE', spaceId: 'product' } })];

    expect(listAvailableTargetKinds(rows, 'a', spaces)).toEqual(['ALL', 'SPACE', 'PAGE']);
    expect(listAvailableTargetKinds(rows, 'b', spaces)).toEqual(['SPACE', 'PAGE']);
    expect(listAvailableTargetKinds(rows, 'b', [{ id: 'product', name: 'Producto' }])).toEqual(['SPACE', 'PAGE']);
  });

  it('switches a row to another kind only when that kind has a free place', () => {
    const rows = [row({ key: 'a' }), row({ key: 'b', target: { kind: 'SPACE', spaceId: 'product' } })];

    expect(readDraftTargetForKind(rows, 'b', ACCESS_TOKEN_TARGET_KINDS.all, spaces)).toBeNull();
    expect(readDraftTargetForKind(rows, 'b', ACCESS_TOKEN_TARGET_KINDS.page, spaces)).toEqual({
      kind: 'PAGE',
      page: null,
    });
    expect(readDraftTargetForKind(rows, 'a', ACCESS_TOKEN_TARGET_KINDS.space, spaces)).toEqual({
      kind: 'SPACE',
      spaceId: 'sales',
    });
  });
});

describe('lo que dice un token en su lista', () => {
  it('names all spaces first, then each space and each page with the level it holds there', () => {
    const lines = summarizeAccessToken({
      allSpaces: [read, collectionsRead],
      pages: [{ pageId: holidays.id, pageTitle: 'Vacaciones', permissions: [], spaceName: 'RR. HH.' }],
      spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite], spaceId: 'product', spaceName: 'Producto' }],
    });

    expect(lines).toEqual([
      { key: 'ALL', level: ACCESS_TOKEN_LEVELS.read, target: { kind: 'ALL' } },
      { key: 'SPACE:product', level: ACCESS_TOKEN_LEVELS.custom, target: { kind: 'SPACE', spaceName: 'Producto' } },
      {
        key: `PAGE:${holidays.id}`,
        level: ACCESS_TOKEN_LEVELS.none,
        target: { kind: 'PAGE', pageTitle: 'Vacaciones', spaceName: 'RR. HH.' },
      },
    ]);
  });
});

describe('cómo se conecta un agente', () => {
  it('writes the MCP entry with the address and the token as a bearer header', () => {
    const config: unknown = JSON.parse(buildAccessTokenMcpConfig('https://brain.example/api/v1/mcp', 'cbk_secret'));

    expect(config).toEqual({
      mcpServers: {
        [MCP_SERVER_KEY]: {
          headers: { authorization: 'Bearer cbk_secret' },
          type: 'http',
          url: 'https://brain.example/api/v1/mcp',
        },
      },
    });
  });
});

describe('hasta cuándo sirve', () => {
  const now = new Date('2026-09-21T12:00:00.000Z');

  it('never expires when asked for no date', () => {
    expect(resolveAccessTokenExpiry(ACCESS_TOKEN_EXPIRY_OPTIONS.never, '', now)).toEqual({ kind: 'NEVER' });
  });

  it('expires the chosen number of days after now', () => {
    expect(resolveAccessTokenExpiry(ACCESS_TOKEN_EXPIRY_OPTIONS.month, '', now)).toEqual({
      expiresAt: new Date('2026-10-21T12:00:00.000Z'),
      kind: 'AT',
    });
  });

  it('expires when the chosen day ends, and asks for a day while none is chosen', () => {
    const resolution = resolveAccessTokenExpiry(ACCESS_TOKEN_EXPIRY_OPTIONS.custom, '2027-03-15', now);

    expect(resolution).toEqual({ expiresAt: new Date(new Date(2027, 2, 16).getTime() - 1), kind: 'AT' });
    expect(resolveAccessTokenExpiry(ACCESS_TOKEN_EXPIRY_OPTIONS.custom, '', now)).toEqual({ kind: 'MISSING' });
    expect(resolveAccessTokenExpiry(ACCESS_TOKEN_EXPIRY_OPTIONS.custom, '2027-02-31', now)).toEqual({
      kind: 'MISSING',
    });
  });

  it('hands the action an instant, nothing for never, and holds back while the day is missing', () => {
    expect(readExpiresAtInput({ expiresAt: new Date('2027-01-01T03:00:00.000Z'), kind: 'AT' })).toBe(
      '2027-01-01T03:00:00.000Z',
    );
    expect(readExpiresAtInput({ kind: 'NEVER' })).toBeNull();
    expect(readExpiresAtInput({ kind: 'MISSING' })).toBeUndefined();
  });

  it('writes a day the way a date field reads it', () => {
    expect(formatDateInputValue(new Date(2027, 0, 5))).toBe('2027-01-05');
  });
});

describe('lo que falta en una fila', () => {
  it('flags a custom row with no box ticked, and not a row that excludes on purpose', () => {
    expect(isDraftRowMissingPermissions(row({ level: ACCESS_TOKEN_LEVELS.custom }))).toBe(true);
    expect(isDraftRowMissingPermissions(row({ level: ACCESS_TOKEN_LEVELS.none }))).toBe(false);
  });
});

describe('cuándo se puede mandar', () => {
  it('needs something given somewhere, exclusions alone are not enough', () => {
    expect(canSubmitAccessDraft([])).toBe(false);
    expect(
      canSubmitAccessDraft([row({ level: ACCESS_TOKEN_LEVELS.none, target: { kind: 'SPACE', spaceId: 'sales' } })]),
    ).toBe(false);
    expect(canSubmitAccessDraft([row({})])).toBe(true);
  });

  it('stops at the most spaces a token can name, and offers no row past what fits', () => {
    const spaces = (count: number) =>
      Array.from({ length: count }, (_unused, index) =>
        row({ key: `s${String(index)}`, target: { kind: 'SPACE', spaceId: `space-${String(index)}` } }),
      );

    expect(canSubmitAccessDraft(spaces(ACCESS_TOKEN_SPACE_GRANT_LIMIT))).toBe(true);
    expect(canSubmitAccessDraft(spaces(ACCESS_TOKEN_SPACE_GRANT_LIMIT + 1))).toBe(false);
    expect(canAddDraftRow(spaces(ACCESS_TOKEN_SPACE_GRANT_LIMIT))).toBe(true);
    expect(canAddDraftRow(spaces(ACCESS_TOKEN_SPACE_GRANT_LIMIT + ACCESS_TOKEN_PAGE_GRANT_LIMIT + 1))).toBe(false);
  });

  it('waits for a page to be chosen in a page row', () => {
    expect(canSubmitAccessDraft([row({ target: { kind: 'PAGE', page: null } })])).toBe(false);
    expect(canSubmitAccessDraft([row({ target: { kind: 'PAGE', page: holidays } })])).toBe(true);
  });

  it('does not allow the same place twice', () => {
    const twice = [
      row({ key: 'a', target: { kind: 'SPACE', spaceId: 'product' } }),
      row({ key: 'b', target: { kind: 'SPACE', spaceId: 'product' } }),
    ];

    expect(canSubmitAccessDraft(twice)).toBe(false);
  });

  it('needs a name that is not in use and a chosen expiry to create one', () => {
    const at = { expiresAt: new Date('2027-01-01T00:00:00.000Z'), kind: 'AT' } as const;

    expect(canSubmitAccessTokenCreate({ expiry: at, name: 'Claude', rows: [row({})], takenNames: [] })).toBe(true);
    expect(canSubmitAccessTokenCreate({ expiry: at, name: '   ', rows: [row({})], takenNames: [] })).toBe(false);
    expect(canSubmitAccessTokenCreate({ expiry: at, name: 'claude', rows: [row({})], takenNames: ['Claude'] })).toBe(
      false,
    );
    expect(
      canSubmitAccessTokenCreate({ expiry: { kind: 'MISSING' }, name: 'Claude', rows: [row({})], takenNames: [] }),
    ).toBe(false);
  });

  it('tells a choice that explains itself from one that is only a label', () => {
    expect(hasChoiceHint({ hint: 'Lee páginas.', label: 'Solo lectura', value: 'READ' })).toBe(true);
    expect(hasChoiceHint({ hint: '', label: 'Sin texto', value: 'EMPTY' })).toBe(false);
    expect(hasChoiceHint({ label: '30 días', value: 'DAYS_30' })).toBe(false);
  });
});
