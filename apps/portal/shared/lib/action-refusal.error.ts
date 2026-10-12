import type { ActionFailureReason } from '@/shared/types/action-failure.types';

/** A deliberate refusal, not a failure on our side; carries the reason a screen shows. */
export abstract class ActionRefusalError extends Error {
  abstract readonly reason: ActionFailureReason;
}
