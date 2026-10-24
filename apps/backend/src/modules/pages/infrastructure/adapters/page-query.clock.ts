import type { PageQueryClock } from '../../types/page-query.types';

/** The clock of the process. A relative date ("today", "this week") is resolved against it for every query. */
export const systemPageQueryClock: PageQueryClock = {
  now: () => new Date(),
};
