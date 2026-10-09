import type { ActionFailureReason } from '@/shared/types/action-failure.types';

/**
 * An action the server turned down on purpose, carrying the reason a screen
 * shows for it. A refusal is not a failure on our side, and it must not reach
 * the reader as one.
 */
export abstract class ActionRefusalError extends Error {
  abstract readonly reason: ActionFailureReason;
}
