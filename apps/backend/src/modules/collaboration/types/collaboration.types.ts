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

/**
 * La página guardada, del lado de la colaboración: con qué sembrar un documento
 * que nadie abrió todavía, y dónde dejar lo que el documento dice cada vez que
 * se persiste.
 */
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

/** Lo que llega por el socket, en cualquiera de las formas en que el servidor lo entrega. */
export type CollaborationSocketMessage = ArrayBuffer | Buffer | Buffer[];

/**
 * Una conexión abierta, del lado de Hocuspocus. Desde la versión 4 no escucha
 * el socket: quien la abre le pasa cada mensaje y el cierre.
 */
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
  /**
   * Un mensaje de una conexión, del tipo que sea: a la de solo lectura se le
   * pide poder leer, a la que escribe, poder escribir.
   */
  readonly authorizeMessage: (
    context: CollaborationContext,
    documentName: string,
    message: Uint8Array,
    connection: { readonly readOnly: boolean },
  ) => Promise<void>;
  readonly shutdown: () => Promise<void>;
  /**
   * Reescribe la página a partir de lo que dice ahora, dentro del documento
   * colaborativo: quien la tenga abierta lo ve en vivo, y se guarda como
   * cualquier otro cambio. Devuelve la página tal como quedó.
   */
  readonly writePageContent: (
    context: CollaborationContext,
    rewrite: CollaborationContentRewrite,
  ) => Promise<PageContent>;
  /**
   * Lo que dice ahora el documento en vivo de una página, si alguien lo tiene
   * abierto; nada si no. No lo abre: leer no tiene por qué cargarlo.
   */
  readonly readLoadedPageContent: (pageId: string) => PageContent | null;
}
