import type { AccessTokenPageReach } from '../types/access-token.types';

export const ACCESS_TOKEN_PRINCIPAL_RESOLVER = Symbol('ACCESS_TOKEN_PRINCIPAL_RESOLVER');

export const ACCESS_TOKEN_EMPTY_PAGE_REACH: AccessTokenPageReach = {
  allowedPageIds: [],
  closedPageIds: [],
  spaceIdsWithAllowedPages: [],
};
