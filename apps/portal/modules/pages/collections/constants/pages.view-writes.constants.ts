import type { ActionFailureReason } from '@/shared/types/action-failure.types';
import type { RejectedCause } from '../../local-cache/types/local-cache.types';

/** What a refusal says when the only thing wrong is that there was no network. */
export const OFFLINE_WRITE_MESSAGE = 'offline';

/** Why the server refused a write, in the causes the person is shown. */
export const REJECTED_CAUSE_BY_REASON: Readonly<Partial<Record<ActionFailureReason, RejectedCause>>> = {
  conflict: 'other',
  forbidden: 'forbidden',
  invalid: 'invalid',
  locked: 'other',
  missing: 'missing',
  tooLarge: 'invalid',
  unexpected: 'other',
};

/** Reasons that say the write may still go through: the network is down, or the server asks to wait. */
export const RETRYABLE_WRITE_REASONS: readonly ActionFailureReason[] = ['offline', 'rateLimited'];
