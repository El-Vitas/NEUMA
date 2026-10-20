import {
  ACTION_FAILURE_REASON_BY_STATUS,
  ACTION_LOCKED_PAGE_ERROR_CODE,
  ACTION_LOCKED_REASON,
  HTTP_CONFLICT,
} from '@/shared/constants/action-failure.constants';
import type { ActionFailureReason } from '@/shared/types/action-failure.types';
import { ActionRefusalError } from './action-refusal.error';
import { ApiError } from './api';
import { NetworkError } from './parse-json-body';

const readApiFailureReason = (error: ApiError): ActionFailureReason => {
  if (error.status === HTTP_CONFLICT && error.code === ACTION_LOCKED_PAGE_ERROR_CODE) return ACTION_LOCKED_REASON;
  return ACTION_FAILURE_REASON_BY_STATUS[error.status] ?? 'unexpected';
};

/** A bare `TypeError` is almost always a code mistake, so it is unexpected rather than offline. */
export const readActionFailureReasonOf = (error: unknown): ActionFailureReason => {
  if (error instanceof ApiError) return readApiFailureReason(error);
  if (error instanceof ActionRefusalError) return error.reason;
  if (error instanceof NetworkError) return 'offline';
  return 'unexpected';
};
