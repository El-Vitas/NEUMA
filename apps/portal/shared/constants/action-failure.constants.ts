/**
 * Why an action could not be carried out, said in a way a screen can translate.
 *
 * The server never hands the reader prose: what comes back is one of these, and
 * each screen turns it into its own sentence. A message written for whoever
 * fixes the software is never the message for whoever was using it.
 */
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

/** The reason for a call that never reached the server. */
export const ACTION_OFFLINE_REASON: (typeof ACTION_FAILURE_REASONS)[number] = 'offline';

/** Which reason a status from the API stands for. */
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
