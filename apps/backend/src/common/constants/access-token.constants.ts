import type { AccessTokenPageReach } from '../types/access-token.types';

export const ACCESS_TOKEN_PRINCIPAL_RESOLVER = Symbol('ACCESS_TOKEN_PRINCIPAL_RESOLVER');

/** Lo que alcanzan las reglas de página de un token que no tiene ninguna. */
export const ACCESS_TOKEN_EMPTY_PAGE_REACH: AccessTokenPageReach = {
  allowedPageIds: [],
  closedPageIds: [],
  spaceIdsWithAllowedPages: [],
};
