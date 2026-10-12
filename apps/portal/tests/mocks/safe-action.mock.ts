import { createSafeActionClient } from 'next-safe-action';
import { readActionFailureReasonOf } from '@/shared/lib/action-failure.lib';

/**
 * Single factory for every test that replaces this module: two factories for one module clash when tests run
 * together. It validates input like production, so what an action rejects is exercised.
 */
export const createSafeActionMock = () => ({
  actionClient: createSafeActionClient({ handleServerError: readActionFailureReasonOf }),
});
