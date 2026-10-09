import type { AccessTokenLevel, AccessTokenPermission, accessTokenAccessSchema } from '@neuma/shared';
import type { z } from 'zod';
import type {
  ACCESS_TOKEN_EXPIRY_VALUES,
  ACCESS_TOKEN_PAGE_SEARCH_STATES,
  ACCESS_TOKEN_TARGET_KINDS,
} from '../constants/access-tokens.constants';
import type {
  accessTokenSchema,
  createdAccessTokenSchema,
  workspaceAccessTokenSchema,
} from '../schemas/access-tokens.schemas';

export type AccessToken = z.infer<typeof accessTokenSchema>;

export type WorkspaceAccessToken = z.infer<typeof workspaceAccessTokenSchema>;

export type CreatedAccessToken = z.infer<typeof createdAccessTokenSchema>;

export type AccessTokenExpiry = (typeof ACCESS_TOKEN_EXPIRY_VALUES)[number];

export type AccessTokenExpiryResolution =
  | { readonly kind: 'AT'; readonly expiresAt: Date }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'NEVER' };

export type AccessTokenAccessInput = z.input<typeof accessTokenAccessSchema>;

export type AccessTokenTargetKind = (typeof ACCESS_TOKEN_TARGET_KINDS)[keyof typeof ACCESS_TOKEN_TARGET_KINDS];

export type AccessTokenPageSearchState =
  (typeof ACCESS_TOKEN_PAGE_SEARCH_STATES)[keyof typeof ACCESS_TOKEN_PAGE_SEARCH_STATES];

export interface AccessTokenPageSearch {
  readonly hasFailed: boolean;
  readonly isSearching: boolean;
  readonly pages: readonly AccessTokenPageOption[];
}

export interface AccessTokenPageOption {
  readonly id: string;
  readonly spaceName: string;
  readonly title: string;
}

/** A page row may not have a page chosen yet. */
export type AccessTokenDraftTarget =
  | { readonly kind: 'ALL' }
  | { readonly kind: 'PAGE'; readonly page: AccessTokenPageOption | null }
  | { readonly kind: 'SPACE'; readonly spaceId: string };

/** The level decides the permissions; customPermissions count only for the custom level. */
export interface AccessTokenDraftRow {
  readonly customPermissions: readonly AccessTokenPermission[];
  readonly key: string;
  readonly level: AccessTokenLevel;
  readonly target: AccessTokenDraftTarget;
}

export interface AccessTokenDraft {
  readonly addRow: (target: AccessTokenDraftTarget) => void;
  readonly removeRow: (key: string) => void;
  readonly rows: readonly AccessTokenDraftRow[];
  readonly setLevel: (key: string, level: AccessTokenLevel) => void;
  readonly setTarget: (key: string, target: AccessTokenDraftTarget) => void;
  readonly togglePermission: (key: string, permission: AccessTokenPermission) => void;
}

export interface AccessTokenSpaceOption {
  readonly id: string;
  readonly name: string;
}

export interface AccessTokenChoice<TValue extends string> {
  readonly hint?: string;
  readonly isDisabled?: boolean;
  readonly label: string;
  readonly value: TValue;
}

export interface AccessTokenSummaryLine {
  readonly key: string;
  readonly level: AccessTokenLevel;
  readonly target: AccessTokenSummaryTarget;
}

export type AccessTokenSummaryTarget =
  | { readonly kind: 'ALL' }
  | { readonly kind: 'PAGE'; readonly pageTitle: string; readonly spaceName: string }
  | { readonly kind: 'SPACE'; readonly spaceName: string };
