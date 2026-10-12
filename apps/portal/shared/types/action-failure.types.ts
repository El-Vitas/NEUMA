import type { ACTION_FAILURE_REASONS } from '../constants/action-failure.constants';

export type ActionFailureReason = (typeof ACTION_FAILURE_REASONS)[number];
