import {
  COLLABORATION_RECONNECT_BASE_DELAY_MS,
  COLLABORATION_RECONNECT_MAX_DELAY_MS,
} from '../constants/pages.collaboration.constants';
import type { CollaborationStatus } from '../types/pages.collaboration.types';

export const computeCollaborationReconnectDelayMs = (attemptNumber: number): number => {
  const clampedAttempt = Math.max(attemptNumber, 1);
  const exponentialDelay = COLLABORATION_RECONNECT_BASE_DELAY_MS * 2 ** (clampedAttempt - 1);
  return Math.min(exponentialDelay, COLLABORATION_RECONNECT_MAX_DELAY_MS);
};

export const getCollaborationStatusLabelKey = (status: CollaborationStatus): string => `collaboration.${status}`;
