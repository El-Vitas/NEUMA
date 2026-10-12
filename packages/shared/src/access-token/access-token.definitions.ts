export const ACCESS_TOKEN_NAME_MAX_LENGTH = 80;

/**
 * Control or invisible characters, which let one name pass for another in a list.
 * The zero-width joiner (U+200D) is allowed only between emojis (optionally after
 * a skin tone or variation selector), where it is part of the emoji.
 */
export const ACCESS_TOKEN_NAME_CONTROL_CHARACTERS =
  /(?!\u{200D})[\p{Cc}\p{Cf}]|(?<![\p{Extended_Pictographic}\p{Emoji_Modifier}\u{FE0F}])\u{200D}|\u{200D}(?!\p{Extended_Pictographic})/u;

export const ACCESS_TOKEN_NAME_WHITESPACE_RUN = /\s+/gu;

/** Past this many named spaces, the token uses "all spaces" instead. */
export const ACCESS_TOKEN_SPACE_GRANT_LIMIT = 50;

/** Each named page already includes everything under it. */
export const ACCESS_TOKEN_PAGE_GRANT_LIMIT = 50;

/**
 * Closed catalog: an unknown permission is never stored. Read is split from write
 * and pages from collections because those are the lines people cut along.
 */
export const ACCESS_TOKEN_PERMISSIONS = {
  pagesRead: 'pages:read',
  pagesWrite: 'pages:write',
  pagesTrash: 'pages:trash',
  /** Lock, verify and assign an owner: trust acts on a page, separate from writing to it. */
  pagesManage: 'pages:manage',
  collectionsRead: 'collections:read',
  collectionsWrite: 'collections:write',
  collectionsConfigure: 'collections:configure',
} as const;

export const ACCESS_TOKEN_PERMISSION_VALUES = [
  ACCESS_TOKEN_PERMISSIONS.pagesRead,
  ACCESS_TOKEN_PERMISSIONS.pagesWrite,
  ACCESS_TOKEN_PERMISSIONS.pagesTrash,
  ACCESS_TOKEN_PERMISSIONS.pagesManage,
  ACCESS_TOKEN_PERMISSIONS.collectionsRead,
  ACCESS_TOKEN_PERMISSIONS.collectionsWrite,
  ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
] as const;

/**
 * Named levels, each including the previous one; anything matching none is custom.
 * `none` grants nothing: it excludes a place another rule opened.
 */
export const ACCESS_TOKEN_LEVELS = {
  none: 'NONE',
  read: 'READ',
  readWrite: 'READ_WRITE',
  full: 'FULL',
  custom: 'CUSTOM',
} as const;

export const ACCESS_TOKEN_LEVEL_VALUES = [
  ACCESS_TOKEN_LEVELS.none,
  ACCESS_TOKEN_LEVELS.read,
  ACCESS_TOKEN_LEVELS.readWrite,
  ACCESS_TOKEN_LEVELS.full,
  ACCESS_TOKEN_LEVELS.custom,
] as const;

export const ACCESS_TOKEN_PRESET_LEVELS = [
  ACCESS_TOKEN_LEVELS.none,
  ACCESS_TOKEN_LEVELS.read,
  ACCESS_TOKEN_LEVELS.readWrite,
  ACCESS_TOKEN_LEVELS.full,
] as const;

const ACCESS_TOKEN_NO_PERMISSIONS = [] as const;

/** Any of these lets the token see the space. */
export const ACCESS_TOKEN_READ_PERMISSIONS = [
  ACCESS_TOKEN_PERMISSIONS.pagesRead,
  ACCESS_TOKEN_PERMISSIONS.collectionsRead,
] as const;

const ACCESS_TOKEN_READ_WRITE_PERMISSIONS = [
  ...ACCESS_TOKEN_READ_PERMISSIONS,
  ACCESS_TOKEN_PERMISSIONS.pagesWrite,
  ACCESS_TOKEN_PERMISSIONS.collectionsWrite,
] as const;

export const ACCESS_TOKEN_LEVEL_PERMISSIONS = {
  [ACCESS_TOKEN_LEVELS.none]: ACCESS_TOKEN_NO_PERMISSIONS,
  [ACCESS_TOKEN_LEVELS.read]: ACCESS_TOKEN_READ_PERMISSIONS,
  [ACCESS_TOKEN_LEVELS.readWrite]: ACCESS_TOKEN_READ_WRITE_PERMISSIONS,
  [ACCESS_TOKEN_LEVELS.full]: ACCESS_TOKEN_PERMISSION_VALUES,
} as const;

export const ACCESS_TOKEN_SPACE_ID_MAX_LENGTH = 128;
