import { ACTION_FAILURE_REASON_BY_STATUS } from '@/shared/constants/action-failure.constants';
import type { ActionFailureReason } from '@/shared/types/action-failure.types';
import { ActionRefusalError } from './action-refusal.error';
import { ApiError } from './api';
import { NetworkError } from './parse-json-body';

/**
 * Why an action could not be carried out, read from what went wrong on the
 * server. A refusal from the API says its own reason by its status, and a
 * refusal made here — no session, not running the workspace — carries its own;
 * not reaching the API is being offline, which every call to it says by
 * wrapping the failure. Anything else is unexpected: a bare `TypeError` is
 * almost always a mistake in the code, and saying "offline" would hide it.
 */
export const readActionFailureReasonOf = (error: unknown): ActionFailureReason => {
  if (error instanceof ApiError) return ACTION_FAILURE_REASON_BY_STATUS[error.status] ?? 'unexpected';
  if (error instanceof ActionRefusalError) return error.reason;
  if (error instanceof NetworkError) return 'offline';
  return 'unexpected';
};
