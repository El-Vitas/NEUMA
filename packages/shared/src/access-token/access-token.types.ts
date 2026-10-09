import type {
  ACCESS_TOKEN_LEVEL_PERMISSIONS,
  ACCESS_TOKEN_LEVEL_VALUES,
  ACCESS_TOKEN_PERMISSION_VALUES,
} from './access-token.definitions.js';

export type AccessTokenPermission = (typeof ACCESS_TOKEN_PERMISSION_VALUES)[number];

export type AccessTokenLevel = (typeof ACCESS_TOKEN_LEVEL_VALUES)[number];

export type AccessTokenPresetLevel = keyof typeof ACCESS_TOKEN_LEVEL_PERMISSIONS;

/** No permissions excludes the space. */
export interface AccessTokenSpaceGrant {
  readonly permissions: readonly AccessTokenPermission[];
  readonly spaceId: string;
}

/** Applies to the page and everything under it. No permissions excludes them all. */
export interface AccessTokenPageGrant {
  readonly pageId: string;
  readonly permissions: readonly AccessTokenPermission[];
}

/** Rules per place; for a page the nearest rule wins, climbing from the page to its space, then all spaces. */
export interface AccessTokenAccess {
  readonly allSpaces: readonly AccessTokenPermission[];
  readonly pages: readonly AccessTokenPageGrant[];
  readonly spaces: readonly AccessTokenSpaceGrant[];
}

/** `lineage` runs from the nearest page to the root; empty for a place that is not a page. */
export interface AccessTokenPlace {
  readonly lineage: readonly string[];
  readonly spaceId: string;
}
