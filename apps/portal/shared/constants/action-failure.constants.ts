/** Codes, not prose: each screen translates them into its own message. */
export const ACTION_FAILURE_REASONS = [
  'invalid',
  'forbidden',
  'missing',
  'conflict',
  'locked',
  'tooLarge',
  'rateLimited',
  'offline',
  'unexpected',
] as const;

export const ACTION_OFFLINE_REASON: (typeof ACTION_FAILURE_REASONS)[number] = 'offline';

export const HTTP_CONFLICT = 409;

/** The code the API gives a 409 when the page is locked, so that case is not told apart from a stale write. */
export const ACTION_LOCKED_PAGE_ERROR_CODE = 'PAGE_LOCKED';

export const ACTION_LOCKED_REASON: (typeof ACTION_FAILURE_REASONS)[number] = 'locked';

export const ACTION_FAILURE_REASON_BY_STATUS: Readonly<Record<number, (typeof ACTION_FAILURE_REASONS)[number]>> = {
  400: 'invalid',
  401: 'forbidden',
  403: 'forbidden',
  404: 'missing',
  409: 'conflict',
  413: 'tooLarge',
  422: 'invalid',
  429: 'rateLimited',
};
