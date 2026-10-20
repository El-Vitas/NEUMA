import type { PageTokenScope } from './page.block.domain.types';

/** The same rule the search applies in SQL, for pages already in memory. */
export const isPageInTokenScope = (
  page: { readonly id: string; readonly spaceId: string },
  scope: PageTokenScope | undefined,
): boolean => {
  if (scope === undefined) return true;
  if (scope.allowedPageIds.includes(page.id)) return true;
  if (scope.closedPageIds.includes(page.id)) return false;
  return scope.readsEverywhere
    ? !scope.closedSpaceIds.includes(page.spaceId)
    : scope.openSpaceIds.includes(page.spaceId);
};
