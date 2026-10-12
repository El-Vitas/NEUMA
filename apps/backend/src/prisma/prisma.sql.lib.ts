import type { NeumaSqlTag } from './types/prisma.types';

/**
 * A text list as a SQL `text[]`, for `= ANY(...)`. Sent as one JSON parameter: raw SQL binds no arrays,
 * and joining the values into a string would break on a value that holds the separator.
 */
export const buildSqlTextList = (
  sql: NeumaSqlTag,
  values: readonly string[],
): ReturnType<ReturnType<NeumaSqlTag>['returns']> =>
  sql`ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(values)}::jsonb))`.returns('pg/text@1');
