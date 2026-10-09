import { ACTION_FAILURE_REASON_BY_STATUS } from '@/shared/constants/action-failure.constants';
import type { ActionFailureReason } from '@/shared/types/action-failure.types';
import { ActionRefusalError } from './action-refusal.error';
import { ApiError } from './api';
import { NetworkError } from './parse-json-body';

/** A bare `TypeError` is almost always a code mistake, so it is unexpected rather than offline. */
export const readActionFailureReasonOf = (error: unknown): ActionFailureReason => {
  if (error instanceof ApiError) return ACTION_FAILURE_REASON_BY_STATUS[error.status] ?? 'unexpected';
  if (error instanceof ActionRefusalError) return error.reason;
  if (error instanceof NetworkError) return 'offline';
  return 'unexpected';
};
