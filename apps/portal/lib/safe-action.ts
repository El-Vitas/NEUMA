import { createSafeActionClient } from 'next-safe-action';
import { readActionFailureReasonOf } from '@/shared/lib/action-failure.lib';

/** Only a failure reason reaches the browser, never the raw error message, which may expose internals. */
export const actionClient = createSafeActionClient({ handleServerError: readActionFailureReasonOf });
