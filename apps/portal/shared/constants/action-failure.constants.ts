/** Codes, not prose: each screen translates them into its own message. */
export const ACTION_FAILURE_REASONS = [
  'invalid',
  'forbidden',
  'missing',
  'conflict',
  'tooLarge',
  'rateLimited',
  'offline',
  'unexpected',
] as const;

export const ACTION_OFFLINE_REASON: (typeof ACTION_FAILURE_REASONS)[number] = 'offline';

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
