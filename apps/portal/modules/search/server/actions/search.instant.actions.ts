'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { withAction } from '@/shared/lib/with-action.lib';
import { getSearchResults } from '@/shared/server/queries/search.queries';
import { SEARCH_INSTANT_RESULT_LIMIT } from '../../constants/search.instant.constants';
import { toSearchInstantPageCandidate } from '../../lib/search.instant.lib';
import { searchInstantQueryInputSchema } from '../../schemas/search.instant.schemas';
import type { SearchInstantPageCandidate } from '../../types/search.types';

export const searchInstantPageCandidatesAction = actionClient
  .inputSchema(searchInstantQueryInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'searchInstantPageCandidates' }, async (): Promise<readonly SearchInstantPageCandidate[]> => {
      if (parsedInput.query === '') return [];
      const result = await getSearchResults({
        limit: SEARCH_INSTANT_RESULT_LIMIT,
        query: parsedInput.query,
        sourceType: 'PAGE',
      });
      if (result.isFail()) throw result.getError();
      return result.getValue().items.map(toSearchInstantPageCandidate);
    }),
  );
