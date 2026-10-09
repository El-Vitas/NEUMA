import type { Prisma } from '@company-brain/db/generated';
import type { SearchTokenScope } from '../../types/search.types';

/** Prisma counterpart of the raw-SQL `buildTokenScopeFilter` used by search; keep the two rules in sync. */
export const buildTokenScopeWhere = (scope: SearchTokenScope): Prisma.PageWhereInput => ({
  OR: [
    { id: { in: [...scope.allowedPageIds] } },
    {
      AND: [
        { id: { notIn: [...scope.closedPageIds] } },
        scope.readsEverywhere
          ? { spaceId: { notIn: [...scope.closedSpaceIds] } }
          : { spaceId: { in: [...scope.openSpaceIds] } },
      ],
    },
  ],
});
