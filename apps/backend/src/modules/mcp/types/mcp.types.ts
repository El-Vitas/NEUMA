import type { AgentActionOutcome } from '@company-brain/db';
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
import type { McpCollectionService, McpRowWriter, McpSchemaColumn } from './mcp.collections.types';

export type McpSearchInput = z.infer<typeof searchInputSchema>;
export type McpSearchOutput = z.infer<typeof searchOutputSchema>;
export type McpFetchOutput = z.infer<typeof fetchOutputSchema>;
export type McpFetchedPage = McpFetchOutput['page'];
export type McpFetchedBlock = NonNullable<McpFetchOutput['block']>;
export type McpFetchedProperty = NonNullable<McpFetchedPage['properties']>[number];
export type McpListPagesInput = z.infer<typeof listPagesInputSchema>;
export type McpListPagesOutput = z.infer<typeof listPagesOutputSchema>;

/** Una propiedad de una fila: la columna y lo que la fila tiene en ella, o nada. */
export interface McpRowProperty extends McpSchemaColumn {
  /** Si la columna es de personas, quiénes son, con su nombre en el espacio de trabajo. */
  readonly people?: McpPerson[];
  readonly value: Exclude<PagePropertyValue, readonly string[]> | string[] | null;
}

/** Describe una fila de una colección ya conocida: sus valores y su título, como propiedades con nombre. */
export type McpRowDescriber = (values: PagePropertyValues | null, title: string) => McpRowProperty[];

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

/** Lo que se anota de una escritura del agente. */
export interface McpActionEntry {
  readonly blockIds: readonly string[];
  /** Qué pidió, en corto: las columnas que cambió, la vista que creó. */
  readonly detail: Readonly<Record<string, string | number | boolean | readonly string[] | null>>;
  readonly outcome: AgentActionOutcome;
  readonly pageId: string | null;
  readonly tokenId: string;
  readonly tool: string;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Lo que el agente pide al escribir, antes de saber cómo termina. */
export type McpActionRequest = Pick<McpActionEntry, 'blockIds' | 'detail' | 'pageId' | 'tool'>;

/** Dónde queda anotado lo que escriben los agentes. */
export interface McpActionLog {
  readonly record: (entry: McpActionEntry) => Promise<void>;
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
  /** Lo que tiene en cada columna, si es una fila de una colección. */
  readonly propertyValues: PagePropertyValues | null;
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
  readonly listReadable: (pageIds: readonly string[], viewer: McpOutlineViewer) => Promise<readonly McpPagePlace[]>;
}

/** Una página que el agente puede ver: dónde está hoy y cómo se llama hoy. */
export interface McpPagePlace {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

/** Una persona del espacio de trabajo, con su nombre. */
export interface McpPerson {
  readonly id: string;
  readonly name: string;
}

/** Las personas del espacio de trabajo, para nombrar a quien una propiedad de persona apunta. */
export interface McpPeopleReader {
  readonly listAssignableMembers: (workspaceId: string) => Promise<readonly McpPerson[]>;
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
  readonly actionLog: McpActionLog;
  readonly backlinks: McpBacklinkReader;
  readonly collections: McpCollectionService;
  readonly errorReporter?: McpErrorReporter;
  readonly outline: McpOutlineReader;
  readonly pagesService: McpPageReader;
  readonly people: McpPeopleReader;
  readonly placeReader: AccessTokenPlaceReader;
  /** Dónde vive el portal, para armar los enlaces que una persona puede abrir. */
  readonly portalUrl: string;
  readonly principalResolver: McpPrincipalResolver;
  readonly rows: McpRowWriter;
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
