import 'server-only';

import { logger } from '@/lib/logger';
import { PAGES_LIST_IS_NOT_A_LIST } from '../../constants/pages.constants';
import { pageSummarySchema } from '../../schemas/pages.schemas';
import type { PageSummary } from '../../types/pages.types';

/**
 * Drops unreadable pages instead of failing the whole space, and logs how many were dropped.
 * A response that is not a list still throws.
 */
export const readPagesThatCanBeRead = (response: unknown, op: string): readonly PageSummary[] => {
  if (!Array.isArray(response)) {
    logger.error({ message: PAGES_LIST_IS_NOT_A_LIST, op });
    throw new Error(PAGES_LIST_IS_NOT_A_LIST);
  }

  const read = response.map((item) => pageSummarySchema.safeParse(item));
  const unreadable = read.filter((one) => !one.success).length;
  if (unreadable > 0) {
    logger.warn({ message: 'Some pages could not be read and were left out of the list', op, unreadable });
  }

  return read.flatMap((one) => (one.success ? [one.data] : []));
};
