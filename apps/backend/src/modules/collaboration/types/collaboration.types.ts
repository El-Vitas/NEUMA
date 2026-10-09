import type { PageContent, UserRole } from '@company-brain/shared';
import type { Hocuspocus, WebSocketLike } from '@hocuspocus/server';

export interface CollaborationContext {
  readonly mode: 'read' | 'write';
  readonly pageId: string;
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface CollaborationTokenRequest {
  readonly mode: 'read' | 'write';
  readonly pageId: string;
}

export interface CollaborationPrincipal {
  readonly role: UserRole;
  readonly sub: string;
}

export interface CollaborationPageAccessResult {
  readonly getValue: () => { readonly lifecycle: 'ACTIVE' | 'TRASHED' };
  readonly isFail: () => boolean;
}

export interface CollaborationPageService {
  readonly getAccessible: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<CollaborationPageAccessResult>;
}

export interface CollaborationWorkspaceService {
  readonly resolveForUser: (userId: string, role: UserRole) => Promise<{ readonly id: string }>;
}

export interface CollaborationTokenSigner {
  readonly signCollaborationToken: (
    user: { readonly id: string; readonly role: UserRole },
    workspaceId: string,
    pageId: string,
    mode: 'read' | 'write',
  ) => Promise<string>;
}

export interface CollaborationTokenAdapter {
  readonly verify: (token: string) => Promise<CollaborationContext>;
}

export interface CollaborationAuthorizationAdapter {
  readonly authorize: (context: CollaborationContext, pageId: string, mode: 'read' | 'write') => Promise<boolean>;
}

export interface CollaborationPersistenceAdapter {
  readonly load: (documentName: string) => Promise<Uint8Array | null>;
  readonly store: (documentName: string, state: Uint8Array) => Promise<void>;
}

/** Stored page as the collaboration side sees it: the seed for unopened documents and the sink for each persist. */
export interface CollaborationContentAdapter {
  readonly load: (pageId: string) => Promise<PageContent | null>;
  readonly store: (context: CollaborationContext, content: PageContent) => Promise<void>;
}

export type CollaborationContentRewrite = (current: PageContent) => PageContent;

export type CollaborationDirectConnection = Awaited<
  ReturnType<Hocuspocus<CollaborationContext>['openDirectConnection']>
>;

export interface CollaborationGatewayDependencies {
  readonly authorization: CollaborationAuthorizationAdapter;
  readonly content: CollaborationContentAdapter;
  readonly persistence: CollaborationPersistenceAdapter;
  readonly token: CollaborationTokenAdapter;
}

export interface CollaborationCloseEvent {
  readonly code: number;
  readonly reason: string;
}

export type CollaborationSocketMessage = ArrayBuffer | Buffer | Buffer[];

/** Since Hocuspocus 4 a connection does not listen to the socket: its opener feeds it every message and the close. */
export interface CollaborationSocketConnection {
  readonly handleClose: (event: CollaborationCloseEvent) => void;
  readonly handleMessage: (data: Uint8Array) => void;
}

export type CollaborationConnectionOpener = (socket: WebSocketLike, request: Request) => CollaborationSocketConnection;

export interface CollaborationGateway {
  readonly handleConnection: (socket: WebSocketLike, request: Request) => ReturnType<Hocuspocus['handleConnection']>;
  readonly server: Hocuspocus<CollaborationContext>;
  readonly validateDocumentName: (documentName: string) => string;
  readonly assertUpdateSize: (update: Uint8Array) => Promise<void>;
  readonly assertStateSize: (state: Uint8Array) => Promise<void>;
  readonly authorizeUpdate: (context: CollaborationContext, documentName: string, update: Uint8Array) => Promise<void>;
  /** Read-only connections need read permission, writing ones need write. */
  readonly authorizeMessage: (
    context: CollaborationContext,
    documentName: string,
    message: Uint8Array,
    connection: { readonly readOnly: boolean },
  ) => Promise<void>;
  readonly shutdown: () => Promise<void>;
  /** Rewrites inside the live document, so open editors see it and it persists like any other change. */
  readonly writePageContent: (
    context: CollaborationContext,
    rewrite: CollaborationContentRewrite,
  ) => Promise<PageContent>;
  /** Null when nobody has the document open; reading never loads it. */
  readonly readLoadedPageContent: (pageId: string) => PageContent | null;
}
