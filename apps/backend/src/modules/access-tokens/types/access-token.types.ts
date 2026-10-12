import type { AccessTokenAccess, UserRole } from '@neuma/shared';
import type { FilterCondition, ModelFilterScope } from '../../../common/types/model.filter.types';
import type {
  AccessTokenCreation,
  AccessTokenOwner,
  AccessTokenRecord,
  AccessTokenWithOwner,
  AccessTokenWorkspaceRecord,
} from '../domain/access-token.domain.types';

export type AccessTokenFilter = (token: ModelFilterScope<'AccessToken'>) => FilterCondition;

/** A token as read from the database, before its permissions are revalidated. */
export interface StoredAccessToken {
  readonly _count: { readonly grants: number; readonly pageGrants: number };
  readonly allSpacesPermissions: readonly string[];
  readonly createdAt: Date;
  readonly displayPrefix: string;
  readonly expiresAt: Date | null;
  readonly grants: readonly {
    readonly permissions: readonly string[];
    readonly space: { readonly id: string; readonly name: string };
  }[];
  readonly id: string;
  readonly lastUsedAt: Date | null;
  readonly name: string;
  readonly pageGrants: readonly {
    readonly page: { readonly id: string; readonly space: { readonly name: string }; readonly title: string };
    readonly permissions: readonly string[];
  }[];
}

export interface NewAccessToken {
  readonly access: AccessTokenAccess;
  readonly displayPrefix: string;
  readonly expiresAt: Date | null;
  readonly name: string;
  readonly secretHash: string;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Checked in the same transaction that saves the token. */
export interface AccessTokenCreationLimits {
  readonly isNameTaken: (liveNames: readonly string[]) => boolean;
  readonly maximumLive: number;
}

export interface AccessTokenLogger {
  readonly error: (fields: Record<string, unknown>, message: string) => void;
  readonly info: (fields: Record<string, unknown>, message: string) => void;
}

export interface AccessTokenRepositoryContract {
  /** A count lower than requested means the user asked for a space they cannot see. */
  readonly countAccessibleSpaces: (
    spaceIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<number>;
  /** A count lower than requested means a page is not visible, trashed or nonexistent. */
  readonly countAccessiblePages: (
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<number>;
  /** Checks and inserts atomically; checking first would let two concurrent creations slip past the limit. */
  readonly createWithinLimit: (
    token: NewAccessToken,
    ownerRole: UserRole,
    limits: AccessTokenCreationLimits,
    now: Date,
  ) => Promise<AccessTokenCreation>;
  readonly findBySecretHash: (secretHash: string) => Promise<AccessTokenWithOwner | null>;
  /** Rules are named only for places the viewer can see. */
  readonly listLive: (viewer: AccessTokenOwner, now: Date) => Promise<readonly AccessTokenRecord[]>;
  readonly listLiveInWorkspace: (viewer: AccessTokenOwner, now: Date) => Promise<readonly AccessTokenWorkspaceRecord[]>;
  /** Only the owner's live tokens; `null` when none matches. */
  readonly replaceAccess: (
    owner: AccessTokenOwner,
    tokenId: string,
    access: AccessTokenAccess,
    now: Date,
  ) => Promise<AccessTokenRecord | null>;
  /** Resolves to whether a token was revoked. */
  readonly revoke: (userId: string, tokenId: string, now: Date) => Promise<boolean>;
  readonly revokeInWorkspace: (workspaceId: string, tokenId: string, now: Date) => Promise<boolean>;
  readonly touch: (tokenId: string, now: Date) => Promise<void>;
}
