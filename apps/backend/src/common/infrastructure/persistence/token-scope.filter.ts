import { and, or } from '@neuma/db';
import type { FilterCondition, ModelFilterScope } from '../../types/model.filter.types';
import type { SearchTokenScope } from '../../types/search.types';

/** Query-builder counterpart of the raw-SQL `buildTokenScopeFilter` used by search; keep the two rules in sync. */
export const buildTokenScopeWhere =
  (scope: SearchTokenScope) =>
  (page: ModelFilterScope<'Page'>): FilterCondition =>
    or(
      page.id.in([...scope.allowedPageIds]),
      and(
        page.id.notIn([...scope.closedPageIds]),
        scope.readsEverywhere
          ? page.spaceId.notIn([...scope.closedSpaceIds])
          : page.spaceId.in([...scope.openSpaceIds]),
      ),
    );
