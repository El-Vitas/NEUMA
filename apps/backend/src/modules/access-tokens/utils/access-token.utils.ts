import {
  ACCESS_TOKEN_DISPLAY_LENGTH,
  ACCESS_TOKEN_ENCODED_RANDOM_PATTERN,
  ACCESS_TOKEN_LAST_USED_RESOLUTION_MS,
  ACCESS_TOKEN_SECRET_PREFIX,
} from '../constants/access-tokens.constants';

export const readAccessTokenDisplayPrefix = (secret: string): string => secret.slice(0, ACCESS_TOKEN_DISPLAY_LENGTH);

/** Lo que ni siquiera tiene forma de token se descarta sin preguntarle a la base. */
export const looksLikeAccessTokenSecret = (value: string): boolean =>
  value.startsWith(ACCESS_TOKEN_SECRET_PREFIX) &&
  ACCESS_TOKEN_ENCODED_RANDOM_PATTERN.test(value.slice(ACCESS_TOKEN_SECRET_PREFIX.length));

export const isLastUseWorthRecording = (lastUsedAt: Date | null, now: Date): boolean =>
  lastUsedAt === null || now.getTime() - lastUsedAt.getTime() >= ACCESS_TOKEN_LAST_USED_RESOLUTION_MS;
