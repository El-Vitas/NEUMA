/**
 * A browser can send the same refresh token twice before the new cookie reaches it (parallel requests, two tabs).
 * Inside this window a used token gets its successor again instead of counting as theft.
 */
export const REFRESH_REPLAY_GRACE_MILLISECONDS = 10_000;

export const MILLISECONDS_PER_SECOND = 1000;

export const REFRESH_SESSION_RETENTION_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const TOKEN_LIFETIME_PATTERN = /^(\d+)([smhd])?$/;

export const TOKEN_LIFETIME_SECONDS_PER_UNIT: Readonly<Record<string, number>> = {
  d: 86_400,
  h: 3600,
  m: 60,
  s: 1,
};
