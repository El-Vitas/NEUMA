import type { ActionFailure } from '@/shared/types/action-result.types';
import { ACTION_FAILURE_REASONS, ACTION_OFFLINE_REASON } from '../constants/action-failure.constants';
import type { ActionFailureReason } from '../types/action-failure.types';

export const hasActionError = (result: unknown): result is ActionFailure => {
  if (typeof result !== 'object' || result === null) return false;
  if ('serverError' in result && typeof result.serverError === 'string') return true;
  if ('validationErrors' in result && typeof result.validationErrors === 'object' && result.validationErrors !== null) {
    return true;
  }
  return false;
};

export const isActionSuccess = <T>(result: unknown): result is { readonly data: T } => {
  if (typeof result !== 'object' || result === null) return false;
  const candidate = result as Record<string, unknown>;
  return 'data' in candidate && candidate.data !== undefined;
};

/** A call that never reaches the server rejects instead of answering; it is reported as offline. */
export const callAction = async <TResult>(send: () => Promise<TResult>): Promise<TResult | ActionFailure> => {
  try {
    return await send();
  } catch {
    return { serverError: ACTION_OFFLINE_REASON };
  }
};

export const readActionFailureReason = (result: unknown): ActionFailureReason => {
  if (typeof result !== 'object' || result === null || !('serverError' in result)) return 'unexpected';
  const reason = result.serverError;
  return ACTION_FAILURE_REASONS.find((known) => known === reason) ?? 'unexpected';
};
