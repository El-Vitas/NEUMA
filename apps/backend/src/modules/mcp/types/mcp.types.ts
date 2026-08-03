import type { PageContent, PageLifecycle, SpaceVisibility, UserRole } from '@company-brain/shared';
import type { SearchReader } from '../../../common/types/search.types';

export interface McpWorkspace {
  readonly id: string;
  readonly name: string;
}

export interface McpSpace {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
}

export interface McpPage {
  readonly content: PageContent;
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly order: number;
  readonly parentId: null | string;
  readonly spaceId: string;
  readonly title: string;
  readonly version: number;
}

export type McpPageSource = Omit<McpPage, 'content'> & { readonly content: unknown };

export interface McpPageReadResult {
  readonly getValue: () => McpPageSource;
  readonly isFail: () => boolean;
}

export interface McpPrincipal {
  readonly role: UserRole;
  readonly userId: string;
}

export interface McpPrincipalResolver {
  readonly resolve: () => Promise<McpPrincipal | null>;
}

export interface McpTokenVerifier {
  readonly verifyAccessToken: (token: string) => Promise<McpTokenPayload>;
}

export interface McpTokenPayload {
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly sub: string;
}

export interface McpWorkspaceReader {
  readonly resolveForUser: (userId: string, role: UserRole) => Promise<McpWorkspace>;
}

export interface McpSpaceReader {
  readonly listAccessible: (workspaceId: string, userId: string, role: UserRole) => Promise<readonly McpSpace[]>;
}

export interface McpPageReader {
  readonly getAccessible: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<McpPageReadResult>;
}

export interface McpServerDependencies {
  readonly errorReporter?: McpErrorReporter;
  readonly pagesService: McpPageReader;
  readonly principalResolver: McpPrincipalResolver;
  readonly searchService: SearchReader;
  readonly spacesService: McpSpaceReader;
  readonly workspacesService: McpWorkspaceReader;
}

export interface McpErrorReporter {
  readonly report: (error: unknown) => void;
}
