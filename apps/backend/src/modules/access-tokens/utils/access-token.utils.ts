import type { AccessTokenAccess } from '@neuma/shared';
import {
  ACCESS_TOKEN_DISPLAY_LENGTH,
  ACCESS_TOKEN_ENCODED_RANDOM_PATTERN,
  ACCESS_TOKEN_LAST_USED_RESOLUTION_MS,
  ACCESS_TOKEN_SECRET_PREFIX,
} from '../constants/access-tokens.constants';
import type { AccessTokenOwner } from '../domain/access-token.domain.types';

export const readAccessTokenDisplayPrefix = (secret: string): string => secret.slice(0, ACCESS_TOKEN_DISPLAY_LENGTH);

/** Cheap shape check so values that cannot be tokens never reach the database. */
export const looksLikeAccessTokenSecret = (value: string): boolean =>
  value.startsWith(ACCESS_TOKEN_SECRET_PREFIX) &&
  ACCESS_TOKEN_ENCODED_RANDOM_PATTERN.test(value.slice(ACCESS_TOKEN_SECRET_PREFIX.length));

export const isLastUseWorthRecording = (lastUsedAt: Date | null, now: Date): boolean =>
  lastUsedAt === null || now.getTime() - lastUsedAt.getTime() >= ACCESS_TOKEN_LAST_USED_RESOLUTION_MS;

/** Log-safe summary of a token's access: counts only, no ids. */
export const describeAccess = (access: AccessTokenAccess): Record<string, unknown> => ({
  allSpacesPermissions: [...access.allSpaces],
  pageRules: access.pages.length,
  spaceRules: access.spaces.length,
});

/** Log-safe identity of the token owner: ids and role, no name or email. */
export const describeOwner = (owner: AccessTokenOwner): Record<string, unknown> => ({
  role: owner.role,
  userId: owner.userId,
  workspaceId: owner.workspaceId,
});
