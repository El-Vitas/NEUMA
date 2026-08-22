'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { withAction } from '@/shared/lib/with-action.lib';
import { getSpaceMembers } from '@/shared/server/queries/space-members.queries';
import { PAGE_PERSON_SEARCH_LIMIT } from '../../editor/text/constants/pages.editor.person.constants';
import { keepThePeopleNamed } from '../../editor/text/lib/pages.editor.person.lib';
import { personMentionSearchInputSchema } from '../../schemas/pages.person.schemas';
import type { PagePersonOption } from '../../types/pages.schema.types';

/**
 * Who a name written after `@` may mean, among the people who can read this
 * space — never a member of a space this page does not belong to.
 */
export const searchPagePersonCandidatesAction = actionClient
  .inputSchema(personMentionSearchInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'searchPagePersonCandidates' }, async (): Promise<readonly PagePersonOption[]> => {
      const members = await getSpaceMembers(parsedInput.spaceId);
      if (members.isFail()) throw members.getError();
      return keepThePeopleNamed(members.getValue(), parsedInput.query, PAGE_PERSON_SEARCH_LIMIT);
    }),
  );
