import type { ActionFailureReason } from '@/shared/types/action-failure.types';
import type { RejectedCause } from '../../local-cache/types/local-cache.types';

/** What a refusal says when the only thing wrong is that there was no network. */
export const OFFLINE_WRITE_MESSAGE = 'offline';

/** What a refusal says when the browser would not keep the write on disk. */
export const STORAGE_REFUSED_WRITE_MESSAGE = 'storage';

/** Why the server refused a write, in the causes the person is shown. */
export const REJECTED_CAUSE_BY_REASON: Readonly<Partial<Record<ActionFailureReason, RejectedCause>>> = {
  conflict: 'conflict',
  forbidden: 'forbidden',
  invalid: 'invalid',
  locked: 'other',
  missing: 'missing',
  tooLarge: 'invalid',
  unexpected: 'other',
};

/** Reasons that say the write may still go through: the network is down, or the server asks to wait. */
export const RETRYABLE_WRITE_REASONS: readonly ActionFailureReason[] = ['offline', 'rateLimited'];

/**
 * Reasons that are a refusal only some of the time: a 5xx and a code mistake are both `unexpected`, and an expired
 * session is `forbidden` until the next request renews it. They are sent again a few times before being set aside.
 */
export const CAPPED_RETRY_WRITE_REASONS: readonly ActionFailureReason[] = ['forbidden', 'unexpected'];

/** Sends of one write that fail in a way that may pass, before it is shown as refused. */
export const VIEW_WRITE_MAXIMUM_ATTEMPTS = 6;
