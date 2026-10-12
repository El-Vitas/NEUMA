import type { AccessTokenAccess, AccessTokenPermission, UserRole } from '@neuma/shared';
import type {
  AccessTokenAccessValidationError,
  AccessTokenExpiryInPastError,
  AccessTokenLimitReachedError,
  AccessTokenNameInvalidError,
  AccessTokenNameTakenError,
  AccessTokenPageNotAccessibleError,
  AccessTokenPermissionBeyondOwnerError,
  AccessTokenSpaceNotAccessibleError,
} from './access-token.error';

export type AccessTokenRefusal =
  | AccessTokenAccessValidationError
  | AccessTokenPageNotAccessibleError
  | AccessTokenPermissionBeyondOwnerError
  | AccessTokenSpaceNotAccessibleError;

export type AccessTokenCreateRefusal =
  | AccessTokenRefusal
  | AccessTokenExpiryInPastError
  | AccessTokenLimitReachedError
  | AccessTokenNameInvalidError
  | AccessTokenNameTakenError;

export interface AccessTokenValidity {
  readonly expiresAt: Date | null;
  readonly revokedAt: Date | null;
}

export interface AccessTokenNamedGrant {
  readonly permissions: readonly AccessTokenPermission[];
  readonly spaceId: string;
  readonly spaceName: string;
}

export interface AccessTokenNamedPageGrant {
  readonly pageId: string;
  readonly pageTitle: string;
  readonly permissions: readonly AccessTokenPermission[];
  readonly spaceName: string;
}

/** Rules are named only for places the viewer can see; the rest are counted in `hiddenPlaceCount`. */
export interface AccessTokenRecord {
  readonly allSpaces: readonly AccessTokenPermission[];
  readonly createdAt: Date;
  readonly displayPrefix: string;
  readonly expiresAt: Date | null;
  readonly hiddenPlaceCount: number;
  readonly id: string;
  readonly lastUsedAt: Date | null;
  readonly name: string;
  readonly pages: readonly AccessTokenNamedPageGrant[];
  readonly spaces: readonly AccessTokenNamedGrant[];
}

export type AccessTokenCreation =
  | { readonly kind: 'CREATED'; readonly token: AccessTokenRecord }
  | { readonly kind: 'LIMIT_REACHED' }
  | { readonly kind: 'NAME_TAKEN' };

export interface AccessTokenWorkspaceRecord extends AccessTokenRecord {
  readonly owner: { readonly id: string; readonly name: string };
}

export interface AccessTokenWithOwner extends AccessTokenValidity {
  readonly access: AccessTokenAccess;
  readonly id: string;
  readonly lastUsedAt: Date | null;
  readonly owner: { readonly id: string; readonly isActive: boolean; readonly role: UserRole };
  readonly workspaceId: string;
}

/** What may be granted or seen derives from the owner, not from the request. */
export interface AccessTokenOwner {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Unvalidated input; the service validates it against the domain. */
export interface AccessTokenDraft {
  readonly access: unknown;
  readonly expiresAt: Date | null;
  readonly name: string;
}

/** The only time the secret leaves the server; it is never stored in plain text. */
export interface CreatedAccessToken {
  readonly secret: string;
  readonly token: AccessTokenRecord;
}
