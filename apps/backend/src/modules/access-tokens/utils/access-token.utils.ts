import type { AccessTokenAccess } from '@company-brain/shared';
import {
  ACCESS_TOKEN_DISPLAY_LENGTH,
  ACCESS_TOKEN_ENCODED_RANDOM_PATTERN,
  ACCESS_TOKEN_LAST_USED_RESOLUTION_MS,
  ACCESS_TOKEN_SECRET_PREFIX,
} from '../constants/access-tokens.constants';
import type { AccessTokenOwner } from '../domain/access-token.domain.types';

export const readAccessTokenDisplayPrefix = (secret: string): string => secret.slice(0, ACCESS_TOKEN_DISPLAY_LENGTH);

/** Lo que ni siquiera tiene forma de token se descarta sin preguntarle a la base. */
export const looksLikeAccessTokenSecret = (value: string): boolean =>
  value.startsWith(ACCESS_TOKEN_SECRET_PREFIX) &&
  ACCESS_TOKEN_ENCODED_RANDOM_PATTERN.test(value.slice(ACCESS_TOKEN_SECRET_PREFIX.length));

export const isLastUseWorthRecording = (lastUsedAt: Date | null, now: Date): boolean =>
  lastUsedAt === null || now.getTime() - lastUsedAt.getTime() >= ACCESS_TOKEN_LAST_USED_RESOLUTION_MS;

/** Lo que un token tiene dado, para el log: qué permisos van a todos los espacios y a cuántos lugares alcanzan reglas propias. */
export const describeAccess = (access: AccessTokenAccess): Record<string, unknown> => ({
  allSpacesPermissions: [...access.allSpaces],
  pageRules: access.pages.length,
  spaceRules: access.spaces.length,
});

/** Quién actuó, para el log: su id, su rol y su espacio de trabajo, sin nada que lo nombre. */
export const describeOwner = (owner: AccessTokenOwner): Record<string, unknown> => ({
  role: owner.role,
  userId: owner.userId,
  workspaceId: owner.workspaceId,
});
