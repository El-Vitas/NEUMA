import { createSafeActionClient } from 'next-safe-action';
import { readActionFailureReasonOf } from '@/shared/lib/action-failure.lib';

/**
 * What an action reports when it could not be carried out.
 *
 * Only a reason travels to the browser, never the words the failure arrived
 * with: those are written for whoever fixes the software, they may name things
 * a reader has no business seeing, and they are in whatever language the
 * service happens to speak. Each screen turns the reason into its own sentence.
 */
export const actionClient = createSafeActionClient({ handleServerError: readActionFailureReasonOf });
