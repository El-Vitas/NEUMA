import { z } from 'zod';
import { SEARCH_EDITED_RANGE_VALUES, SEARCH_MAX_AUTHOR_QUERY_LENGTH } from '../constants/search.filters.constants';

const firstValue = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

export const searchExtraFiltersSchema = z.object({
  authorQuery: z
    .preprocess(firstValue, z.string().trim().optional())
    .transform((value) =>
      value === undefined || value === '' ? undefined : value.slice(0, SEARCH_MAX_AUTHOR_QUERY_LENGTH),
    )
    .optional(),
  editedRange: z.preprocess(firstValue, z.enum(SEARCH_EDITED_RANGE_VALUES).optional().catch(undefined)),
  verifiedOnly: z
    .preprocess(firstValue, z.string().optional())
    .transform((value) => (value === 'true' ? true : undefined))
    .optional(),
});
