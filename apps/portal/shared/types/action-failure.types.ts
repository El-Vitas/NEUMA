import type { ACTION_FAILURE_REASONS } from '../constants/action-failure.constants';

/** Why an action could not be carried out. */
export type ActionFailureReason = (typeof ACTION_FAILURE_REASONS)[number];
