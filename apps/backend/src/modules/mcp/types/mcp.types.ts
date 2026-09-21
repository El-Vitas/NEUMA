import type {
  AccessTokenPermission,
  PageContent,
  PageLifecycle,
  SpaceVisibility,
  UserRole,
} from '@company-brain/shared';
import type { McpServer } from '@modelcontextprotocol/server';
import type { z } from 'zod';
import type { AccessTokenPrincipal } from '../../../common/types/access-token.types';
import type { SearchReader } from '../../../common/types/search.types';
import type { searchCompanyBrainInputSchema, searchCompanyBrainOutputSchema } from '../schemas/mcp.schemas';

export type McpSearchInput = z.infer<typeof searchCompanyBrainInputSchema>;
export type McpSearchOutput = z.infer<typeof searchCompanyBrainOutputSchema>;

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

/** En nombre de quién actúa el agente, y con qué token entró, para que lo que haga quede a su nombre. */
export type McpPrincipal = AccessTokenPrincipal;

export interface McpPrincipalResolver {
  readonly resolve: () => Promise<McpPrincipal | null>;
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

/**
 * Una herramienta y lo que hace falta para ofrecerla.
 *
 * `requires` son los permisos que la abren: basta tener uno en algún espacio.
 * Que alcance para el espacio concreto de cada llamada lo revisa la
 * herramienta al correr.
 */
export interface McpToolDefinition {
  readonly name: string;
  readonly register: (server: McpServer, dependencies: McpServerDependencies) => void;
  readonly requires: readonly AccessTokenPermission[];
}
