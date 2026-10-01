import type { AgentActionOutcome } from '@company-brain/db';
import type {
  AccessTokenPermission,
  AccessTokenPlace,
  PageContent,
  PageDocumentNodeShape,
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
import type { MCP_CALL_OUTCOMES, MCP_REFUSAL_REASONS } from '../constants/mcp.constants';
import type {
  fetchOutputSchema,
  listPagesInputSchema,
  listPagesOutputSchema,
  searchInputSchema,
  searchOutputSchema,
} from '../schemas/mcp.schemas';
import type { McpCollectionService, McpRowWriter, McpSchemaColumn } from './mcp.collections.types';
import type { McpPageManager } from './mcp.page-management.types';
import type { McpContentEditor, McpDrawingValidator } from './mcp.pages.types';

export type McpSearchInput = z.infer<typeof searchInputSchema>;
export type McpSearchOutput = z.infer<typeof searchOutputSchema>;
export type McpFetchOutput = z.infer<typeof fetchOutputSchema>;
export type McpFetchedPage = McpFetchOutput['page'];
export type McpFetchedBlock = NonNullable<McpFetchOutput['block']>;
export type McpFetchedProperty = NonNullable<McpFetchedPage['properties']>[number];
export type McpPageState = NonNullable<McpFetchedPage['state']>;
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
  readonly id: string;
}

/** Un tramo de una página larga: sus bloques de arriba y desde cuál sigue, si sigue. */
/** Un bloque y el bloque que lo lleva dentro, o nada si está arriba del todo en la página. */
export interface McpHeldBlock {
  readonly holder: PageDocumentNodeShape | null;
  readonly node: PageDocumentNodeShape;
}

export interface McpPagePart {
  readonly nextStart: number | null;
  readonly nodes: readonly unknown[];
}

/** Lo que se anota de una escritura del agente. */
export interface McpActionEntry {
  readonly blockIds: readonly string[];
  /** Qué pidió, en corto: las columnas que cambió, la vista que creó. */
  readonly detail: Readonly<Record<string, string | number | boolean | readonly string[] | null>>;
  readonly pageId: string | null;
  readonly tokenId: string;
  readonly tool: string;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Lo que el agente pide al escribir, antes de saber cómo termina. */
export type McpActionRequest = Pick<McpActionEntry, 'blockIds' | 'detail' | 'pageId' | 'tool'>;

/** Lo que hace falta para anotar una escritura: el registro, y a quién contarle si el registro falla. */
export type McpActionDependencies = Pick<McpServerDependencies, 'actionLog' | 'observer'>;

/** Cómo se cierra una acción anotada: todo resultado salvo seguir pendiente. */
export type McpActionClosing = Exclude<AgentActionOutcome, 'PENDING'>;

/**
 * Dónde queda anotado lo que escriben los agentes: la acción se abre antes de
 * escribir y se cierra con su resultado.
 */
export interface McpActionLog {
  readonly finish: (actionId: string, outcome: McpActionClosing) => Promise<void>;
  /** Anota la acción como pendiente y devuelve su id. */
  readonly start: (entry: McpActionEntry) => Promise<string>;
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
  /** Cuándo la bloquearon contra cambios; nada si no está bloqueada. */
  readonly lockedAt: Date | null;
  readonly order: number;
  /** Quién responde por la página, si alguien. */
  readonly owner: null | McpPerson;
  readonly parentId: null | string;
  /** Lo que la página tiene en cada columna, si es una fila de una colección. */
  readonly propertyValues: PagePropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
  /** Hasta cuándo vale la verificación; nada si vale sin plazo o no la hay. */
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly verifiedBy: null | McpPerson;
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

/** Una página donde el token tiene una regla propia, con el lugar donde está. */
export interface McpGrantPlace {
  readonly pageId: string;
  readonly place: AccessTokenPlace;
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
  readonly content: McpContentEditor;
  readonly drawings: McpDrawingValidator;
  readonly observer: McpObserver;
  readonly outline: McpOutlineReader;
  readonly pages: McpPageManager;
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

/** Cómo terminó una llamada: hecha, rechazada con un motivo para el agente, o fallida sin que nadie lo esperara. */
export type McpCallOutcome = (typeof MCP_CALL_OUTCOMES)[keyof typeof MCP_CALL_OUTCOMES];

/** Una llamada que terminó, para medir qué herramientas se usan, cuánto tardan y cuánto fallan. */
/** Lo único que necesita la revisión de diagramas y fórmulas. */
export type McpDrawingDependencies = Pick<McpServerDependencies, 'drawings'>;

/** Por qué se rechazó una llamada, en una etiqueta fija que puede ir al log sin copiar lo que el agente escribió. */
export type McpRefusalReason = (typeof MCP_REFUSAL_REASONS)[keyof typeof MCP_REFUSAL_REASONS];

export interface McpFinishedCall {
  readonly durationMs: number;
  readonly outcome: McpCallOutcome;
  readonly refusal?: McpRefusalReason;
  readonly tool: string;
}

/** Lo que el MCP necesita de un logger: escribir un hecho o un error con sus campos. Lo cumplen Pino y el de Nest. */
export interface McpLogger {
  readonly error: (fields: object, message: string) => void;
  readonly info: (fields: object, message: string) => void;
}

/**
 * A quién se le cuenta lo que pasa dentro del MCP.
 *
 * Es obligatorio a propósito: cada puerta de entrada (HTTP, terminal) tiene
 * que decir dónde van sus fallos, así ninguno se pierde en silencio.
 */
export interface McpObserver {
  readonly callFinished: (call: McpFinishedCall) => void;
  /** Un fallo que nadie esperaba, entero y con su traza, y dónde pasó. */
  readonly unexpected: (error: unknown, where: string) => void;
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
