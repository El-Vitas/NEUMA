import type { McpServer } from '@modelcontextprotocol/server';
import type { AgentActionOutcome } from '@neuma/db';
import type {
  AccessTokenPermission,
  AccessTokenPlace,
  PageContent,
  PageDocumentNodeShape,
  PageLifecycle,
  PagePropertyValue,
  PagePropertyValues,
  Result,
  SpaceVisibility,
  UserRole,
} from '@neuma/shared';
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
import type {
  McpCollectionService,
  McpCollectionShape,
  McpNameLister,
  McpRowWriter,
  McpSchemaColumn,
} from './mcp.collections.types';
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

export interface McpRowProperty extends McpSchemaColumn {
  readonly people?: McpPerson[];
  readonly value: Exclude<PagePropertyValue, readonly string[]> | string[] | null;
}

export type McpRowDescriber = (row: {
  readonly id: string;
  readonly propertyValues: PagePropertyValues | null;
  readonly title: string;
}) => McpRowProperty[];

export interface McpBlockComment {
  readonly author: string;
  readonly blockId: string;
  readonly body: string;
  readonly createdAt: string;
  readonly id: string;
}

export interface McpHeldBlock {
  readonly holder: PageDocumentNodeShape | null;
  readonly node: PageDocumentNodeShape;
}

export interface McpPagePart {
  readonly nextStart: number | null;
  readonly nodes: readonly unknown[];
}

export interface McpActionEntry {
  readonly blockIds: readonly string[];
  readonly detail: Readonly<Record<string, string | number | boolean | readonly string[] | null>>;
  readonly pageId: string | null;
  readonly requestId: string | null;
  readonly tokenId: string;
  readonly tool: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export type McpActionRequest = Pick<McpActionEntry, 'blockIds' | 'detail' | 'pageId' | 'tool'>;

export type McpActionDependencies = Pick<McpServerDependencies, 'actionLog' | 'observer'>;

/** Recorded even if the write never happens. */
export interface McpAttempt {
  readonly requestId?: string | undefined;
  readonly target: string | null;
  readonly tool: string;
}

export interface McpLiveRequest {
  readonly actionId: string;
  readonly isDone: boolean;
  readonly pageId: string | null;
  readonly startedAt: Date;
  /** The same id used by another tool is not a retry. */
  readonly tool: string;
}

/** `createdPageIdOf` names a created page so the recorded action attaches to it. */
export type McpWriteRecorder = <TResult>(
  request: McpActionRequest,
  write: () => Promise<TResult>,
  createdPageIdOf?: (result: TResult) => string,
) => Promise<TResult>;

export interface McpWriteSession {
  readonly call: McpCall;
  readonly record: McpWriteRecorder;
}

export type McpActionClosing = Exclude<AgentActionOutcome, 'PENDING'>;

/** The action opens before the write and closes with its result. */
export interface McpActionLog {
  readonly finish: (actionId: string, outcome: McpActionClosing, createdPageId?: string) => Promise<void>;
  readonly findLiveRequest: (tokenId: string, requestId: string) => Promise<McpLiveRequest | null>;
  /** Fails with McpRequestTakenError if the same token and request id was recorded first. */
  readonly start: (entry: McpActionEntry) => Promise<string>;
}

export interface McpCall {
  readonly principal: McpPrincipal;
  readonly viewer: McpOutlineViewer;
  readonly workspace: McpWorkspace;
}

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
  readonly propertyValues: PagePropertyValues | null;
  readonly title: string;
}

/** An ancestor the agent cannot see has no id or title. */
export type McpAncestor =
  | { readonly id: string; readonly isReadable: true; readonly title: string }
  | { readonly id: null; readonly isReadable: false; readonly title: null };

export interface McpOutlineReader {
  readonly listAncestors: (pageId: string, viewer: McpOutlineViewer) => Promise<readonly McpAncestor[]>;
  readonly listChildren: (
    spaceId: string,
    parentId: string | null,
    viewer: McpOutlineViewer,
    window: { readonly skip: number; readonly take: number },
  ) => Promise<{ readonly entries: readonly McpOutlineEntry[]; readonly total: number }>;
  readonly listReadable: (pageIds: readonly string[], viewer: McpOutlineViewer) => Promise<readonly McpPagePlace[]>;
}

export interface McpPagePlace {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

export interface McpPerson {
  readonly id: string;
  readonly name: string;
}

export interface McpPeopleReader {
  readonly listAssignableMembers: (workspaceId: string) => Promise<readonly McpPerson[]>;
}

/** Which blocks a person may read, whatever the token says: a block can close itself to people. */
export interface McpBlockAccessReader {
  readonly findReadableBlockIds: (
    blockIds: readonly string[],
    viewer: { readonly role: UserRole; readonly userId: string; readonly workspaceId: string },
  ) => Promise<ReadonlySet<string>>;
}

export interface McpBacklink {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

export interface McpBacklinkReader {
  readonly listBacklinks: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<{ readonly items: readonly McpBacklink[] }>;
}

/**
 * A link names the page and, with `#`, the block; a bare id may be either and is
 * tried as a page first.
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
  readonly lockedAt: Date | null;
  readonly order: number;
  readonly owner: null | McpPerson;
  readonly parentId: null | string;
  readonly propertyValues: PagePropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly verifiedBy: null | McpPerson;
  readonly version: number;
}

export type McpPageSource = Omit<McpPage, 'content'> & { readonly content: unknown };

/** The place is where permission was checked: the parent's, or the space itself for a space root. */
export interface McpCreationPlace {
  readonly parentId: string | null;
  readonly parentPlace: AccessTokenPlace;
  readonly spaceId: string;
}

export interface McpOpenedPage {
  readonly page: McpPageSource;
  readonly place: AccessTokenPlace;
}

export interface McpOpenRow {
  readonly listNames: McpNameLister;
  readonly place: AccessTokenPlace;
  readonly row: McpPageSource;
  readonly shape: McpCollectionShape;
}

/** Not visible and nonexistent get the same answer, so existence is not leaked. */
export type McpPageReadResult = Result<McpPageSource>;

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
  readonly blockAccess: McpBlockAccessReader;
  readonly collections: McpCollectionService;
  readonly content: McpContentEditor;
  readonly drawings: McpDrawingValidator;
  readonly observer: McpObserver;
  readonly outline: McpOutlineReader;
  readonly pages: McpPageManager;
  readonly pagesService: McpPageReader;
  readonly people: McpPeopleReader;
  readonly placeReader: AccessTokenPlaceReader;
  readonly portalUrl: string;
  readonly principalResolver: McpPrincipalResolver;
  readonly rows: McpRowWriter;
  readonly searchService: SearchReader & PageBlockSearchReader;
  readonly spacesService: McpSpaceReader;
  readonly workspacesService: McpWorkspaceReader;
}

export type McpCallOutcome = (typeof MCP_CALL_OUTCOMES)[keyof typeof MCP_CALL_OUTCOMES];

export type McpDrawingDependencies = Pick<McpServerDependencies, 'drawings'>;

/** Fixed label, safe to log without copying agent-written text. */
export type McpRefusalReason = (typeof MCP_REFUSAL_REASONS)[keyof typeof MCP_REFUSAL_REASONS];

export interface McpFinishedCall {
  readonly durationMs: number;
  readonly outcome: McpCallOutcome;
  readonly refusal?: McpRefusalReason;
  readonly tool: string;
}

export interface McpLogger {
  readonly error: (fields: object, message: string) => void;
  readonly info: (fields: object, message: string) => void;
}

/** Required on purpose: each entry point (HTTP, stdio) must say where its failures go. */
export interface McpObserver {
  readonly callFinished: (call: McpFinishedCall) => void;
  readonly unexpected: (error: unknown, where: string) => void;
}

/**
 * `requires` lists permissions that unlock the tool; holding one anywhere suffices,
 * and each call rechecks its own place with the nearest rule.
 */
export interface McpToolDefinition {
  readonly name: string;
  readonly register: (server: McpServer, dependencies: McpServerDependencies) => void;
  readonly requires: readonly AccessTokenPermission[];
}
