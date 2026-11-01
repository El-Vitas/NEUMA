import type { PageFilter } from '@neuma/shared';
import { PAGE_FILTER_GROUP_OPERATOR } from '@neuma/shared';

/** A filter every row passes: a group of conditions with none, joined by "and". */
export const MATCHES_EVERY_ROW: PageFilter = {
  conditions: [],
  kind: 'GROUP',
  operator: PAGE_FILTER_GROUP_OPERATOR.AND,
};
