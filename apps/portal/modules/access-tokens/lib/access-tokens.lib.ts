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
} from '@neuma/shared';
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

export const readDraftRowPermissions = (row: AccessTokenDraftRow): readonly AccessTokenPermission[] =>
  row.level === ACCESS_TOKEN_LEVELS.custom ? row.customPermissions : listAccessTokenLevelPermissions(row.level);

/** Null for a page row with no page chosen yet. */
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

export const listGrantablePermissions = (role: UserRole): readonly AccessTokenPermission[] =>
  ACCESS_TOKEN_PERMISSION_VALUES.filter((permission) => canRoleGrantAccessTokenPermission(role, permission));

const isLevelGrantable = (role: UserRole, level: AccessTokenLevel): boolean =>
  level === ACCESS_TOKEN_LEVELS.custom ||
  listAccessTokenLevelPermissions(level).every((permission) => canRoleGrantAccessTokenPermission(role, permission));

/** "No access" on all spaces says nothing; it only makes sense to exclude something. */
const isLevelMeaningfulFor = (level: AccessTokenLevel, kind: AccessTokenTargetKind): boolean =>
  level !== ACCESS_TOKEN_LEVELS.none || kind !== ACCESS_TOKEN_TARGET_KINDS.all;

export const readLevelMeaningfulFor = (level: AccessTokenLevel, target: AccessTokenDraftTarget): AccessTokenLevel =>
  isLevelMeaningfulFor(level, target.kind) ? level : ACCESS_TOKEN_LEVELS.read;

export const listGrantableLevels = (role: UserRole, kind: AccessTokenTargetKind): readonly AccessTokenLevel[] =>
  ACCESS_TOKEN_LEVEL_VALUES.filter((level) => isLevelGrantable(role, level) && isLevelMeaningfulFor(level, kind));

/** A custom row with no box checked grants nothing and says nothing; "no access" at least states an exclusion. */
export const isDraftRowMissingPermissions = (row: AccessTokenDraftRow): boolean =>
  row.level === ACCESS_TOKEN_LEVELS.custom && row.customPermissions.length === 0;

const listTargetKeys = (rows: readonly AccessTokenDraftRow[]): readonly (string | null)[] =>
  rows.map((row) => readDraftTargetKey(row.target));

const isEveryRowComplete = (rows: readonly AccessTokenDraftRow[]): boolean =>
  listTargetKeys(rows).every((key) => key !== null) && !rows.some(isDraftRowMissingPermissions);

const namesEachPlaceOnce = (rows: readonly AccessTokenDraftRow[]): boolean =>
  new Set(listTargetKeys(rows)).size === rows.length;

const isWithinGrantLimits = (rows: readonly AccessTokenDraftRow[]): boolean =>
  listRowsOfKind(rows, 'PAGE').length <= ACCESS_TOKEN_PAGE_GRANT_LIMIT &&
  listRowsOfKind(rows, 'SPACE').length <= ACCESS_TOKEN_SPACE_GRANT_LIMIT;

/** One row for all spaces plus the most spaces and pages a token may name. */
export const canAddDraftRow = (rows: readonly AccessTokenDraftRow[]): boolean =>
  rows.length < ACCESS_TOKEN_PAGE_GRANT_LIMIT + ACCESS_TOKEN_SPACE_GRANT_LIMIT + 1;

export const canSubmitAccessDraft = (rows: readonly AccessTokenDraftRow[]): boolean =>
  rows.length > 0 &&
  isEveryRowComplete(rows) &&
  namesEachPlaceOnce(rows) &&
  isWithinGrantLimits(rows) &&
  hasAccessTokenAnyPermission(draftRowsToAccess(rows));

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

export const listRowSpaceOptions = (
  rows: readonly AccessTokenDraftRow[],
  rowKey: string,
  spaces: readonly AccessTokenSpaceOption[],
): readonly AccessTokenSpaceOption[] => listFreeSpaces(listOtherRows(rows, rowKey), spaces);

export const listPagesTakenByOtherRows = (rows: readonly AccessTokenDraftRow[], rowKey: string): readonly string[] =>
  listRowsOfKind(listOtherRows(rows, rowKey), 'PAGE').flatMap((row) =>
    row.target.page === null ? [] : [row.target.page.id],
  );

export const excludePageOptions = (
  options: readonly AccessTokenPageOption[],
  excludedPageIds: readonly string[],
): readonly AccessTokenPageOption[] => {
  const excluded = new Set(excludedPageIds);
  return options.filter((option) => !excluded.has(option.id));
};

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

/** Null when the kind has no free place left. */
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

export const listAvailableTargetKinds = (
  rows: readonly AccessTokenDraftRow[],
  rowKey: string,
  spaces: readonly AccessTokenSpaceOption[],
): readonly AccessTokenTargetKind[] =>
  ACCESS_TOKEN_TARGET_KIND_VALUES.filter((kind) => readDraftTargetForKind(rows, rowKey, kind, spaces) !== null);

export const findNewRowTarget = (
  rows: readonly AccessTokenDraftRow[],
  spaces: readonly AccessTokenSpaceOption[],
): AccessTokenDraftTarget =>
  readDraftTargetForKind(rows, '', ACCESS_TOKEN_TARGET_KINDS.all, spaces) ??
  readDraftTargetForKind(rows, '', ACCESS_TOKEN_TARGET_KINDS.space, spaces) ?? { kind: 'PAGE', page: null };

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

/** Last instant of the day in the chooser's local time, so the list shows the day that was picked. */
const readEndOfChosenDay = (dateInputValue: string): Date | null => {
  const parts = ACCESS_TOKEN_DATE_INPUT_PATTERN.exec(dateInputValue);
  if (parts === null) return null;
  const [year, month, day] = [Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])];
  const chosen = new Date(year, month, day);
  const isRealDay = chosen.getFullYear() === year && chosen.getMonth() === month && chosen.getDate() === day;
  return isRealDay ? new Date(new Date(year, month, day + 1).getTime() - 1) : null;
};

/** A chosen date covers the whole day. The server rechecks that the expiry is in the future. */
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

/** Null means the token never expires; undefined means the date is still missing. */
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

export const formatDateInputValue = (date: Date): string =>
  `${String(date.getFullYear())}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const hasChoiceHint = <TValue extends string>(choice: AccessTokenChoice<TValue>): boolean =>
  choice.hint !== undefined && choice.hint.length > 0;
