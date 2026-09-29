import type {
  AccessTokenPermission,
  PageContent,
  PageLifecycle,
  PagePropertyValue,
  PagePropertyValues,
  SpaceVisibility,
  UserRole,
} from '@company-brain/shared';
import type { McpServer } from '@modelcontextprotocol/server';
import type { z } from 'zod';
import type { AccessTokenPlaceReader, AccessTokenPrincipal } from '../../../common/types/access-token.types';
import type { PageBlockSearchReader, SearchReader, SearchTokenScope } from '../../../common/types/search.types';
import type {
  fetchOutputSchema,
  listPagesInputSchema,
  listPagesOutputSchema,
  searchInputSchema,
  searchOutputSchema,
} from '../schemas/mcp.schemas';

export type McpSearchInput = z.infer<typeof searchInputSchema>;
export type McpSearchOutput = z.infer<typeof searchOutputSchema>;
export type McpFetchOutput = z.infer<typeof fetchOutputSchema>;
export type McpFetchedPage = McpFetchOutput['page'];
export type McpFetchedBlock = NonNullable<McpFetchOutput['block']>;
export type McpListPagesInput = z.infer<typeof listPagesInputSchema>;
export type McpListPagesOutput = z.infer<typeof listPagesOutputSchema>;

/** Una columna de una colección, lo que hace falta para nombrar un valor. */
export interface McpSchemaColumn {
  readonly key: string;
  readonly label: string;
  readonly type: string;
}

/** Una propiedad de una fila: la columna y lo que la fila tiene en ella, o nada. */
export interface McpRowProperty extends McpSchemaColumn {
  readonly value: Exclude<PagePropertyValue, readonly string[]> | string[] | null;
}

export interface McpSchemaReadResult {
  readonly getValue: () => { readonly properties: readonly McpSchemaColumn[] };
  readonly isFail: () => boolean;
}

/** Las columnas de una colección, si su dueño la puede ver. */
export interface McpSchemaReader {
  readonly getSchema: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<McpSchemaReadResult>;
}

/** Lo que alguien dijo sobre un bloque. */
export interface McpBlockComment {
  readonly author: string;
  readonly blockId: string;
  readonly body: string;
  readonly createdAt: string;
}

/** Un tramo de una página larga: sus bloques de arriba y desde cuál sigue, si sigue. */
export interface McpPagePart {
  readonly nextStart: number | null;
  readonly nodes: readonly unknown[];
}

/** Con qué corre una llamada: quién llama, en qué espacio de trabajo, y lo que su token deja leer. */
export interface McpCall {
  readonly principal: McpPrincipal;
  readonly viewer: McpOutlineViewer;
  readonly workspace: McpWorkspace;
}

/** Quién mira el árbol: la persona dueña del token, recortada a lo que el token deja leer. */
export interface McpOutlineViewer {
  readonly role: UserRole;
  readonly tokenScope: SearchTokenScope;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface McpOutlineEntry {
  readonly childCount: number;
  readonly id: string;
  readonly isCollection: boolean;
  readonly title: string;
}

export interface McpAncestor {
  readonly id: string;
  readonly isReadable: boolean;
  readonly title: string;
}

/** El árbol de páginas, leído sin abrir las páginas. */
export interface McpOutlineReader {
  readonly listAncestors: (pageId: string, viewer: McpOutlineViewer) => Promise<readonly McpAncestor[]>;
  readonly listChildren: (
    spaceId: string,
    parentId: string | null,
    viewer: McpOutlineViewer,
  ) => Promise<readonly McpOutlineEntry[]>;
  readonly listReadable: (
    pageIds: readonly string[],
    viewer: McpOutlineViewer,
  ) => Promise<readonly { readonly id: string; readonly spaceId: string }[]>;
}

export interface McpBacklink {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

/** Las páginas que enlazan a otra, ya filtradas por lo que su dueño puede ver. */
export interface McpBacklinkReader {
  readonly listBacklinks: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<{ readonly items: readonly McpBacklink[] }>;
}

/**
 * Lo que el agente pasó para abrir algo, ya leído.
 *
 * Un enlace dice qué página es y, si trae `#`, qué bloque. Un id suelto no dice
 * si es de página o de bloque: se prueba primero como página.
 */
export type McpAddress =
  | { readonly blockId: string | null; readonly kind: 'page'; readonly pageId: string }
  | { readonly id: string; readonly kind: 'id' }
  | { readonly kind: 'invalid' };

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
  /** Lo que la página tiene en cada columna, si es una fila de una colección. */
  readonly propertyValues: PagePropertyValues | null;
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
  readonly backlinks: McpBacklinkReader;
  readonly errorReporter?: McpErrorReporter;
  readonly outline: McpOutlineReader;
  readonly pagesService: McpPageReader;
  readonly schemas: McpSchemaReader;
  readonly placeReader: AccessTokenPlaceReader;
  /** Dónde vive el portal, para armar los enlaces que una persona puede abrir. */
  readonly portalUrl: string;
  readonly principalResolver: McpPrincipalResolver;
  readonly searchService: SearchReader & PageBlockSearchReader;
  readonly spacesService: McpSpaceReader;
  readonly workspacesService: McpWorkspaceReader;
}

export interface McpErrorReporter {
  readonly report: (error: unknown) => void;
}

/**
 * Una herramienta y lo que hace falta para ofrecerla.
 *
 * `requires` son los permisos que la abren: basta tener uno en algún lugar.
 * Que alcance para el lugar concreto de cada llamada lo revisa la
 * herramienta al correr, con la regla más cercana.
 */
export interface McpToolDefinition {
  readonly name: string;
  readonly register: (server: McpServer, dependencies: McpServerDependencies) => void;
  readonly requires: readonly AccessTokenPermission[];
}
