import {
  ACCESS_TOKEN_LEVEL_VALUES,
  ACCESS_TOKEN_LEVELS,
  ACCESS_TOKEN_PAGE_GRANT_LIMIT,
  ACCESS_TOKEN_PERMISSION_VALUES,
  ACCESS_TOKEN_SPACE_GRANT_LIMIT,
  type AccessTokenLevel,
  type AccessTokenPermission,
  canRoleGrantAccessTokenPermission,
  hasAccessTokenAnyPermission,
  isAccessTokenNameAcceptable,
  isAccessTokenNameTaken,
  listAccessTokenLevelPermissions,
  MILLISECONDS_IN_A_DAY,
  readAccessTokenLevel,
  type UserRole,
} from '@company-brain/shared';
import { BEARER_PREFIX } from '@/shared/constants/auth.constants';
import {
  ACCESS_TOKEN_DATE_INPUT_PATTERN,
  ACCESS_TOKEN_DATE_PART_LENGTH,
  ACCESS_TOKEN_EXPIRY_DAYS,
  ACCESS_TOKEN_EXPIRY_OPTIONS,
  ACCESS_TOKEN_MCP_CONFIG_INDENT,
  ACCESS_TOKEN_MCP_TRANSPORT,
  ACCESS_TOKEN_PAGE_SEARCH_MIN_LENGTH,
  ACCESS_TOKEN_PAGE_SEARCH_STATES,
  ACCESS_TOKEN_TARGET_KEY_SEPARATOR,
  ACCESS_TOKEN_TARGET_KIND_VALUES,
  ACCESS_TOKEN_TARGET_KINDS,
  MCP_SERVER_KEY,
} from '../constants/access-tokens.constants';
import type {
  AccessToken,
  AccessTokenAccessInput,
  AccessTokenChoice,
  AccessTokenDraftRow,
  AccessTokenDraftTarget,
  AccessTokenExpiry,
  AccessTokenExpiryResolution,
  AccessTokenPageOption,
  AccessTokenPageSearch,
  AccessTokenPageSearchState,
  AccessTokenSpaceOption,
  AccessTokenSummaryLine,
  AccessTokenTargetKind,
} from '../types/access-tokens.types';

/** Los permisos que da una fila: los del nivel, o los marcados a mano si es personalizado. */
export const readDraftRowPermissions = (row: AccessTokenDraftRow): readonly AccessTokenPermission[] =>
  row.level === ACCESS_TOKEN_LEVELS.custom ? row.customPermissions : listAccessTokenLevelPermissions(row.level);

/** La clave de un lugar, única entre las filas; una fila de página sin página elegida no tiene. */
export const readDraftTargetKey = (target: AccessTokenDraftTarget): string | null => {
  switch (target.kind) {
    case 'ALL':
      return ACCESS_TOKEN_TARGET_KINDS.all;
    case 'SPACE':
      return `${ACCESS_TOKEN_TARGET_KINDS.space}${ACCESS_TOKEN_TARGET_KEY_SEPARATOR}${target.spaceId}`;
    default:
      return target.page === null
        ? null
        : `${ACCESS_TOKEN_TARGET_KINDS.page}${ACCESS_TOKEN_TARGET_KEY_SEPARATOR}${target.page.id}`;
  }
};

const listRowsOfKind = <TKind extends AccessTokenDraftTarget['kind']>(
  rows: readonly AccessTokenDraftRow[],
  kind: TKind,
): readonly (AccessTokenDraftRow & { readonly target: Extract<AccessTokenDraftTarget, { kind: TKind }> })[] =>
  rows.filter(
    (row): row is AccessTokenDraftRow & { readonly target: Extract<AccessTokenDraftTarget, { kind: TKind }> } =>
      row.target.kind === kind,
  );

/** Lo que se manda al servidor a partir de las filas del formulario. */
export const draftRowsToAccess = (rows: readonly AccessTokenDraftRow[]): AccessTokenAccessInput => ({
  allSpaces: [...new Set(listRowsOfKind(rows, 'ALL').flatMap(readDraftRowPermissions))],
  pages: listRowsOfKind(rows, 'PAGE').flatMap((row) =>
    row.target.page === null ? [] : [{ pageId: row.target.page.id, permissions: [...readDraftRowPermissions(row)] }],
  ),
  spaces: listRowsOfKind(rows, 'SPACE').map((row) => ({
    permissions: [...readDraftRowPermissions(row)],
    spaceId: row.target.spaceId,
  })),
});

const toDraftRow = (
  key: string,
  target: AccessTokenDraftTarget,
  permissions: readonly AccessTokenPermission[],
): AccessTokenDraftRow => {
  const level = readAccessTokenLevel(permissions);
  return { customPermissions: level === ACCESS_TOKEN_LEVELS.custom ? permissions : [], key, level, target };
};

/** Las filas que muestran lo que un token ya tiene dado, para cambiarlo. */
export const accessToDraftRows = (
  access: Pick<AccessToken, 'allSpaces' | 'pages' | 'spaces'>,
): readonly AccessTokenDraftRow[] => [
  ...(access.allSpaces.length > 0
    ? [toDraftRow(ACCESS_TOKEN_TARGET_KINDS.all, { kind: 'ALL' }, access.allSpaces)]
    : []),
  ...access.spaces.map((grant) =>
    toDraftRow(grant.spaceId, { kind: 'SPACE', spaceId: grant.spaceId }, grant.permissions),
  ),
  ...access.pages.map((grant) =>
    toDraftRow(
      grant.pageId,
      { kind: 'PAGE', page: { id: grant.pageId, spaceName: grant.spaceName, title: grant.pageTitle } },
      grant.permissions,
    ),
  ),
];

/** Los permisos que alguien con este rol puede poner en un token: los demás ni se ofrecen. */
export const listGrantablePermissions = (role: UserRole): readonly AccessTokenPermission[] =>
  ACCESS_TOKEN_PERMISSION_VALUES.filter((permission) => canRoleGrantAccessTokenPermission(role, permission));

const isLevelGrantable = (role: UserRole, level: AccessTokenLevel): boolean =>
  level === ACCESS_TOKEN_LEVELS.custom ||
  listAccessTokenLevelPermissions(level).every((permission) => canRoleGrantAccessTokenPermission(role, permission));

/** «Sin acceso» en todos los espacios es lo mismo que no decir nada: solo tiene sentido para excluir algo. */
const isLevelMeaningfulFor = (level: AccessTokenLevel, kind: AccessTokenTargetKind): boolean =>
  level !== ACCESS_TOKEN_LEVELS.none || kind !== ACCESS_TOKEN_TARGET_KINDS.all;

/** El nivel que queda al mover una fila a otro lugar: «sin acceso» en todos los espacios pasa a solo lectura. */
export const readLevelMeaningfulFor = (level: AccessTokenLevel, target: AccessTokenDraftTarget): AccessTokenLevel =>
  isLevelMeaningfulFor(level, target.kind) ? level : ACCESS_TOKEN_LEVELS.read;

/** Los niveles que alguien con este rol puede dar en esta clase de lugar. Personalizado siempre, con sus casillas. */
export const listGrantableLevels = (role: UserRole, kind: AccessTokenTargetKind): readonly AccessTokenLevel[] =>
  ACCESS_TOKEN_LEVEL_VALUES.filter((level) => isLevelGrantable(role, level) && isLevelMeaningfulFor(level, kind));

/** Una fila personalizada sin ninguna casilla marcada: no dice qué da. «Sin acceso», en cambio, lo dice. */
export const isDraftRowMissingPermissions = (row: AccessTokenDraftRow): boolean =>
  row.level === ACCESS_TOKEN_LEVELS.custom && row.customPermissions.length === 0;

const listTargetKeys = (rows: readonly AccessTokenDraftRow[]): readonly (string | null)[] =>
  rows.map((row) => readDraftTargetKey(row.target));

const isEveryRowComplete = (rows: readonly AccessTokenDraftRow[]): boolean =>
  listTargetKeys(rows).every((key) => key !== null) && !rows.some(isDraftRowMissingPermissions);

const namesEachPlaceOnce = (rows: readonly AccessTokenDraftRow[]): boolean =>
  new Set(listTargetKeys(rows)).size === rows.length;

/** Si el token nombra no más espacios ni páginas de los que el servidor acepta en uno. */
const isWithinGrantLimits = (rows: readonly AccessTokenDraftRow[]): boolean =>
  listRowsOfKind(rows, 'PAGE').length <= ACCESS_TOKEN_PAGE_GRANT_LIMIT &&
  listRowsOfKind(rows, 'SPACE').length <= ACCESS_TOKEN_SPACE_GRANT_LIMIT;

/** Si cabe otra fila: una para todos los espacios, más los espacios y páginas que un token puede nombrar. */
export const canAddDraftRow = (rows: readonly AccessTokenDraftRow[]): boolean =>
  rows.length < ACCESS_TOKEN_PAGE_GRANT_LIMIT + ACCESS_TOKEN_SPACE_GRANT_LIMIT + 1;

/**
 * Si el formulario dice algo que se pueda mandar: cada fila completa, cada
 * lugar una vez, no más lugares de los que un token nombra, y algo dado en alguno.
 */
export const canSubmitAccessDraft = (rows: readonly AccessTokenDraftRow[]): boolean =>
  rows.length > 0 &&
  isEveryRowComplete(rows) &&
  namesEachPlaceOnce(rows) &&
  isWithinGrantLimits(rows) &&
  hasAccessTokenAnyPermission(draftRowsToAccess(rows));

/** Si un token nuevo se puede pedir: con un nombre que sirve y no está en uso, con vencimiento, y con acceso. */
export const canSubmitAccessTokenCreate = (request: {
  readonly expiry: AccessTokenExpiryResolution;
  readonly name: string;
  readonly rows: readonly AccessTokenDraftRow[];
  readonly takenNames: readonly string[];
}): boolean =>
  isAccessTokenNameAcceptable(request.name.trim()) &&
  !isAccessTokenNameTaken(request.name, request.takenNames) &&
  request.expiry.kind !== 'MISSING' &&
  canSubmitAccessDraft(request.rows);

const listOtherRows = (rows: readonly AccessTokenDraftRow[], rowKey: string): readonly AccessTokenDraftRow[] =>
  rows.filter((row) => row.key !== rowKey);

const listFreeSpaces = (
  rows: readonly AccessTokenDraftRow[],
  spaces: readonly AccessTokenSpaceOption[],
): readonly AccessTokenSpaceOption[] => {
  const taken = new Set(listRowsOfKind(rows, 'SPACE').map((row) => row.target.spaceId));
  return spaces.filter((space) => !taken.has(space.id));
};

/** Los espacios que puede nombrar una fila: el suyo y los que ninguna otra fila nombró. */
export const listRowSpaceOptions = (
  rows: readonly AccessTokenDraftRow[],
  rowKey: string,
  spaces: readonly AccessTokenSpaceOption[],
): readonly AccessTokenSpaceOption[] => listFreeSpaces(listOtherRows(rows, rowKey), spaces);

/** Las páginas que ya nombran las demás filas: esa fila no las puede volver a nombrar. */
export const listPagesTakenByOtherRows = (rows: readonly AccessTokenDraftRow[], rowKey: string): readonly string[] =>
  listRowsOfKind(listOtherRows(rows, rowKey), 'PAGE').flatMap((row) =>
    row.target.page === null ? [] : [row.target.page.id],
  );

/** Las páginas encontradas que todavía se pueden nombrar. */
export const excludePageOptions = (
  options: readonly AccessTokenPageOption[],
  excludedPageIds: readonly string[],
): readonly AccessTokenPageOption[] => options.filter((option) => !excludedPageIds.includes(option.id));

/** En qué está la búsqueda de páginas: falta escribir, busca, falló, no encontró, o encontró. */
export const readPageSearchState = (
  query: string,
  search: AccessTokenPageSearch,
  offered: readonly AccessTokenPageOption[],
): AccessTokenPageSearchState => {
  if (query.trim().length < ACCESS_TOKEN_PAGE_SEARCH_MIN_LENGTH) return ACCESS_TOKEN_PAGE_SEARCH_STATES.tooShort;
  if (search.isSearching) return ACCESS_TOKEN_PAGE_SEARCH_STATES.searching;
  if (search.hasFailed) return ACCESS_TOKEN_PAGE_SEARCH_STATES.failed;
  return offered.length === 0 ? ACCESS_TOKEN_PAGE_SEARCH_STATES.empty : ACCESS_TOKEN_PAGE_SEARCH_STATES.found;
};

const hasAllSpacesRow = (rows: readonly AccessTokenDraftRow[]): boolean => listRowsOfKind(rows, 'ALL').length > 0;

/**
 * El lugar con que queda una fila al pasar a otra clase: todos los espacios si
 * ninguna otra fila lo tiene, el primer espacio libre, o una página por elegir.
 * Nada si esa clase ya no tiene lugar libre.
 */
export const readDraftTargetForKind = (
  rows: readonly AccessTokenDraftRow[],
  rowKey: string,
  kind: AccessTokenTargetKind,
  spaces: readonly AccessTokenSpaceOption[],
): AccessTokenDraftTarget | null => {
  const others = listOtherRows(rows, rowKey);
  switch (kind) {
    case 'ALL':
      return hasAllSpacesRow(others) ? null : { kind: 'ALL' };
    case 'SPACE': {
      const space = listFreeSpaces(others, spaces).at(0);
      return space === undefined ? null : { kind: 'SPACE', spaceId: space.id };
    }
    default:
      return { kind: 'PAGE', page: null };
  }
};

/** El nombre del lugar de una fila: el del espacio o el título de la página; nada para todos, o sin elegir. */
export const nameDraftTarget = (
  target: AccessTokenDraftTarget,
  spaces: readonly AccessTokenSpaceOption[],
): string | null => {
  switch (target.kind) {
    case 'SPACE':
      return spaces.find((space) => space.id === target.spaceId)?.name ?? null;
    case 'PAGE':
      return target.page?.title ?? null;
    default:
      return null;
  }
};

/** Las clases de lugar a las que puede pasar una fila: las que todavía tienen un lugar libre para ella. */
export const listAvailableTargetKinds = (
  rows: readonly AccessTokenDraftRow[],
  rowKey: string,
  spaces: readonly AccessTokenSpaceOption[],
): readonly AccessTokenTargetKind[] =>
  ACCESS_TOKEN_TARGET_KIND_VALUES.filter((kind) => readDraftTargetForKind(rows, rowKey, kind, spaces) !== null);

/** Dónde empieza una fila nueva: todos los espacios si están libres, el primer espacio libre, o una página. */
export const findNewRowTarget = (
  rows: readonly AccessTokenDraftRow[],
  spaces: readonly AccessTokenSpaceOption[],
): AccessTokenDraftTarget =>
  readDraftTargetForKind(rows, '', ACCESS_TOKEN_TARGET_KINDS.all, spaces) ??
  readDraftTargetForKind(rows, '', ACCESS_TOKEN_TARGET_KINDS.space, spaces) ?? { kind: 'PAGE', page: null };

/** Lo que un token tiene dado, línea por línea: primero todos los espacios, después cada espacio y cada página. */
export const summarizeAccessToken = (
  access: Pick<AccessToken, 'allSpaces' | 'pages' | 'spaces'>,
): readonly AccessTokenSummaryLine[] => [
  ...(access.allSpaces.length > 0
    ? [
        {
          key: ACCESS_TOKEN_TARGET_KINDS.all,
          level: readAccessTokenLevel(access.allSpaces),
          target: { kind: 'ALL' } as const,
        },
      ]
    : []),
  ...access.spaces.map((grant) => ({
    key: `${ACCESS_TOKEN_TARGET_KINDS.space}${ACCESS_TOKEN_TARGET_KEY_SEPARATOR}${grant.spaceId}`,
    level: readAccessTokenLevel(grant.permissions),
    target: { kind: 'SPACE' as const, spaceName: grant.spaceName },
  })),
  ...access.pages.map((grant) => ({
    key: `${ACCESS_TOKEN_TARGET_KINDS.page}${ACCESS_TOKEN_TARGET_KEY_SEPARATOR}${grant.pageId}`,
    level: readAccessTokenLevel(grant.permissions),
    target: { kind: 'PAGE' as const, pageTitle: grant.pageTitle, spaceName: grant.spaceName },
  })),
];

/** La entrada que un agente pega en su configuración de MCP para conectarse con este token. */
export const buildAccessTokenMcpConfig = (mcpUrl: string, secret: string): string =>
  JSON.stringify(
    {
      mcpServers: {
        [MCP_SERVER_KEY]: {
          headers: { authorization: `${BEARER_PREFIX}${secret}` },
          type: ACCESS_TOKEN_MCP_TRANSPORT,
          url: mcpUrl,
        },
      },
    },
    null,
    ACCESS_TOKEN_MCP_CONFIG_INDENT,
  );

/**
 * El último instante del día escrito en un campo de fecha, en la hora de quien
 * lo eligió, o nada si lo escrito no es un día que exista. Es el último y no el
 * primero del día siguiente para que la lista diga el mismo día que se eligió.
 */
const readEndOfChosenDay = (dateInputValue: string): Date | null => {
  const parts = ACCESS_TOKEN_DATE_INPUT_PATTERN.exec(dateInputValue);
  if (parts === null) return null;
  const [year, month, day] = [Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])];
  const chosen = new Date(year, month, day);
  const isRealDay = chosen.getFullYear() === year && chosen.getMonth() === month && chosen.getDate() === day;
  return isRealDay ? new Date(new Date(year, month, day + 1).getTime() - 1) : null;
};

/**
 * Cuándo vence un token con lo elegido. Una fecha elegida vale el día entero:
 * vence cuando termina ese día, donde vive quien la eligió. El servidor vuelve
 * a exigir que sea después de ahora.
 */
export const resolveAccessTokenExpiry = (
  expiry: AccessTokenExpiry,
  customDate: string,
  now: Date,
): AccessTokenExpiryResolution => {
  switch (expiry) {
    case ACCESS_TOKEN_EXPIRY_OPTIONS.never:
      return { kind: 'NEVER' };
    case ACCESS_TOKEN_EXPIRY_OPTIONS.custom: {
      const endOfDay = readEndOfChosenDay(customDate);
      return endOfDay === null ? { kind: 'MISSING' } : { expiresAt: endOfDay, kind: 'AT' };
    }
    default:
      return {
        expiresAt: new Date(now.getTime() + ACCESS_TOKEN_EXPIRY_DAYS[expiry] * MILLISECONDS_IN_A_DAY),
        kind: 'AT',
      };
  }
};

/** El vencimiento como lo pide la acción: un instante, nada si no vence, o sin decidir si falta la fecha. */
export const readExpiresAtInput = (resolution: AccessTokenExpiryResolution): string | null | undefined => {
  switch (resolution.kind) {
    case 'AT':
      return resolution.expiresAt.toISOString();
    case 'NEVER':
      return null;
    default:
      return undefined;
  }
};

const padDatePart = (value: number): string => String(value).padStart(ACCESS_TOKEN_DATE_PART_LENGTH, '0');

/** Un día como lo escribe y lo lee un campo de fecha, en la hora de quien mira. */
export const formatDateInputValue = (date: Date): string =>
  `${String(date.getFullYear())}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

/** Una opción que trae su explicación necesita espacio para ella; una que es solo un nombre, no. */
export const hasChoiceHint = <TValue extends string>(choice: AccessTokenChoice<TValue>): boolean =>
  choice.hint !== undefined && choice.hint.length > 0;
