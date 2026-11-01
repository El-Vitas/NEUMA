import { z } from 'zod';
import { SEARCH_MAX_QUERY_LENGTH } from '@/shared/constants/search.constants';

export const personMentionSearchInputSchema = z.object({
  query: z.string().trim().max(SEARCH_MAX_QUERY_LENGTH),
  spaceId: z.uuid(),
});
