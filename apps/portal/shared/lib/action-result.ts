import type { ActionFailure } from '@/shared/types/action-result.types';

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
