import type { AccessTokenAccess, AccessTokenPlace, UserRole } from '@company-brain/shared';
import type { FastifyRequest } from 'fastify';

/** The role is the owner's current one, not the one at creation time. */
export interface AccessTokenPrincipal {
  readonly access: AccessTokenAccess;
  readonly role: UserRole;
  readonly tokenId: string;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Contract the agent guards depend on, so they do not import the tokens module. */
export interface AccessTokenPrincipalResolver {
  readonly resolvePrincipal: (secret: string) => Promise<AccessTokenPrincipal | null>;
}

export type AccessTokenRequest = FastifyRequest & { accessTokenPrincipal?: AccessTokenPrincipal };

export interface AccessTokenRefusalLogger {
  readonly warn: (fields: Record<string, unknown>, message: string) => void;
}

export interface AccessTokenPageRuleProbe {
  readonly allows: boolean;
  readonly pageId: string;
}

/** Pages not listed here fall back to their space's rule, then the all-spaces rule. */
export interface AccessTokenPageReach {
  readonly allowedPageIds: readonly string[];
  readonly closedPageIds: readonly string[];
  readonly spaceIdsWithAllowedPages: readonly string[];
}

export interface AccessTokenLineageRow {
  readonly id: string;
  readonly spaceId: string;
}

export interface AccessTokenOriginLineageRow extends AccessTokenLineageRow {
  readonly originId: string;
}

export interface AccessTokenReachRow {
  readonly allows: boolean;
  readonly id: string;
  readonly spaceId: string;
}

export interface AccessTokenPlaceReader {
  /** Ancestors run from nearest to root; `null` when the page is not in that workspace. */
  readonly readPlace: (pageId: string, workspaceId: string) => Promise<AccessTokenPlace | null>;
  /** Pages outside the workspace are omitted. */
  readonly readPlaces: (
    pageIds: readonly string[],
    workspaceId: string,
  ) => Promise<ReadonlyMap<string, AccessTokenPlace>>;
  readonly resolvePageReach: (
    rules: readonly AccessTokenPageRuleProbe[],
    workspaceId: string,
  ) => Promise<AccessTokenPageReach>;
}
