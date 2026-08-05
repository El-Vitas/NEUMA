'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { withAction } from '@/shared/lib/with-action.lib';
import { getSearchResults } from '@/shared/server/queries/search.queries';
import { PAGE_MENTION_SEARCH_LIMIT } from '../../constants/pages.mentions.constants';
import { toPageMentionCandidate } from '../../lib/pages.mentions.lib';
import { pageMentionSearchInputSchema } from '../../schemas/pages.mentions.schemas';
import type { PageMentionCandidate } from '../../types/pages.mentions.types';

export const searchPageMentionCandidatesAction = actionClient
  .schema(pageMentionSearchInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'searchPageMentionCandidates' }, async (): Promise<readonly PageMentionCandidate[]> => {
      const result = await getSearchResults({
        limit: PAGE_MENTION_SEARCH_LIMIT,
        query: parsedInput.query,
        sourceType: 'PAGE',
      });
      if (result.isFail()) throw result.getError();
      return result.getValue().items.map(toPageMentionCandidate);
    }),
  );
